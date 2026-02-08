# Echo 同步架构设计

> 更新时间: 2026-02-07

## 概述

本文档描述 Echo 的数据持久化和多端同步架构。

**核心架构**:
- **IndexedDB** 为唯一写入点和权威数据源
- **iCloud Drive** 为同步通道（通过 File System Access API）
- **Loro CRDT** 处理多端合并冲突

```
日常使用:
  Zustand ←→ Loro Doc ←→ IndexedDB (唯一写入点)

同步操作 (手动/定期):
  IndexedDB ──→ iCloud Drive 文件 (单向推送)
```

## 设计原则

### 1. IndexedDB 为权威数据源

- 所有写操作只写 IndexedDB
- 同步操作从 IndexedDB 单向推送到 iCloud
- 避免 iCloud 数据不全导致的问题

### 2. 离线优先

所有核心功能在离线时 100% 可用，同步是增强而非必需。

### 3. 用户数据自主

- 数据存储在用户自己的设备/iCloud 中
- 不依赖第三方服务器存储用户内容
- 用户完全控制自己的数据

### 4. Embedding 本地生成，不同步

**关键决策**: Embedding 向量不参与同步。

| 理由 | 说明 |
|------|------|
| **可重建性** | Embedding 可以根据素材内容随时重新生成，不是原始数据 |
| **向量维度高** | all-MiniLM-L6-v2 产生 384 维向量，每条素材约 1.5KB |
| **CRDT 不适合** | 向量是整体替换语义，不存在合并冲突，用 CRDT 是 overkill |
| **模型版本问题** | 不同端可能使用不同版本模型，向量不兼容 |
| **节省同步带宽** | 100 条素材的 embedding 约 150KB，无需同步 |

**策略**: 每个端独立计算 embedding，同步新素材后本地重建。

---

## 实现方案

### Phase 1: Loro + IndexedDB 持久化

**目标**: 单设备数据不丢失，数据格式从一开始就是最终形态

```
┌─────────────────────────────────────────┐
│                 Web App                  │
│  ┌─────────────────────────────────┐    │
│  │         Zustand Store           │    │
│  └──────────────┬──────────────────┘    │
│                 ▼                        │
│  ┌─────────────────────────────────┐    │
│  │          Loro Doc               │    │
│  │  ┌─────────┐  ┌─────────┐      │    │
│  │  │LoroMap  │  │LoroList │      │    │
│  │  │materials│  │ outputs │      │    │
│  │  └─────────┘  └─────────┘      │    │
│  └──────────────┬──────────────────┘    │
│                 ▼                        │
│  ┌─────────────────────────────────┐    │
│  │         IndexedDB               │    │
│  │   (Loro snapshot 持久化)         │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**为什么从一开始就用 Loro**:

- 零迁移成本 - 数据格式从一开始就是最终形态
- POC 阶段就能验证 Loro 的基础使用
- iCloud 同步只需"把文件放到正确位置"

**技术选型**:

| 平台 | 存储方案 | 库 |
|------|----------|-----|
| Web | IndexedDB | Dexie.js |
| React Native | SQLite | expo-sqlite |

**Loro 数据模型**:

```typescript
import { Loro, LoroMap, LoroList } from 'loro-crdt';

// 创建文档
const doc = new Loro();

// 素材使用 LoroMap (key: materialId)
const materials = doc.getMap('materials');

// 每个素材是一个嵌套的 LoroMap
function addMaterial(material: RawMaterial) {
  const m = materials.setContainer(material.id, new LoroMap());
  m.set('id', material.id);
  m.set('content', material.content);
  m.set('note', material.note ?? null);
  m.set('createdAt', material.createdAt);
  // 注意: embedding 不存入 Loro
}

// 输出使用 LoroList (按时间排序)
const outputs = doc.getList('outputs');

function addOutput(output: EchoOutput) {
  const o = outputs.pushContainer(new LoroMap());
  o.set('id', output.id);
  o.set('content', output.content);
  o.set('sessionId', output.sessionId);
  o.set('materialIds', JSON.stringify(output.materialIds));
  o.set('createdAt', output.createdAt);
}
```

**持久化实现**:

```typescript
// 保存: Loro snapshot → IndexedDB
async function save() {
  const snapshot = doc.exportSnapshot();
  await db.meta.put({ key: 'loro-snapshot', value: snapshot });
}

// 加载: IndexedDB → Loro Doc
async function load() {
  const record = await db.meta.get('loro-snapshot');
  if (record) {
    doc.import(record.value);
  }
}

// 自动保存
doc.subscribe(() => {
  // debounce 后保存
  debouncedSave();
});
window.addEventListener('beforeunload', save);
```

---

### Phase 2: iCloud 同步

**目标**: 多端数据同步

```
┌──────────────┐              ┌──────────────┐
│   Device A   │              │   Device B   │
│  ┌────────┐  │              │  ┌────────┐  │
│  │ Loro   │  │              │  │ Loro   │  │
│  │  Doc   │  │              │  │  Doc   │  │
│  └───┬────┘  │              │  └───┬────┘  │
│      │       │              │      │       │
│      ▼       │              │      ▼       │
│ ┌──────────┐ │              │ ┌──────────┐ │
│ │IndexedDB │ │              │ │IndexedDB │ │
│ │ (权威源) │ │              │ │ (权威源) │ │
│ └────┬─────┘ │              │ └────┬─────┘ │
└──────┼───────┘              └──────┼───────┘
       │                             │
       │ 手动/定期同步                 │ 手动/定期同步
       ▼                             ▼
┌─────────────────────────────────────────────┐
│              iCloud Drive                    │
│  ┌─────────────────────────────────────┐    │
│  │  Echo/                               │    │
│  │  └── echo-data.loro                 │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

**Web 端 iCloud 访问 (File System Access API)**:

```typescript
// 1. 用户授权选择 iCloud 文件夹
let icloudHandle: FileSystemDirectoryHandle | null = null;

async function connectICloud() {
  icloudHandle = await window.showDirectoryPicker();
  // 持久化 handle 到 IndexedDB，下次可复用
  await db.meta.put({ key: 'icloud-handle', value: icloudHandle });
}

// 2. 写入 iCloud
async function writeToICloud(snapshot: Uint8Array) {
  if (!icloudHandle) return;

  const fileHandle = await icloudHandle.getFileHandle('echo-data.loro', { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(snapshot);
  await writable.close();
}

// 3. 从 iCloud 读取
async function readFromICloud(): Promise<Uint8Array | null> {
  if (!icloudHandle) return null;

  try {
    const fileHandle = await icloudHandle.getFileHandle('echo-data.loro');
    const file = await fileHandle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null; // 文件不存在
  }
}
```

**同步操作**:

```typescript
// 同步到 iCloud (IndexedDB → iCloud)
async function syncToICloud() {
  // 1. 从 IndexedDB 读取最新数据
  const record = await db.meta.get('loro-snapshot');
  if (!record) return;

  // 2. 推送到 iCloud
  await writeToICloud(record.value);

  // 3. 记录同步时间
  await db.meta.put({ key: 'last-sync', value: Date.now() });
}

// 从 iCloud 恢复 (新设备/首次)
async function restoreFromICloud() {
  // 1. 从 iCloud 读取
  const snapshot = await readFromICloud();
  if (!snapshot) return;

  // 2. 导入到 Loro Doc
  doc.import(snapshot);

  // 3. 保存到 IndexedDB
  await save();

  // 4. 重建本地 embedding
  await ensureEmbeddings(getAllMaterials());
}

// 合并 iCloud 数据 (多端同步)
async function mergeFromICloud() {
  const remoteSnapshot = await readFromICloud();
  if (!remoteSnapshot) return;

  // Loro CRDT 自动处理合并
  doc.import(remoteSnapshot);

  // 保存合并后的结果
  await save();

  // 重新推送到 iCloud (合并后的完整数据)
  await syncToICloud();

  // 重建缺失的 embedding
  await ensureEmbeddings(getAllMaterials());
}
```

**UI 设计**:

```
┌─────────────────────────────────────┐
│  Settings                           │
├─────────────────────────────────────┤
│  ☁️ iCloud 同步                     │
│                                     │
│  状态: 已连接 ~/iCloud Drive/Echo   │
│  上次同步: 2 分钟前                  │
│                                     │
│  [立即同步]  [从 iCloud 恢复]        │
│                                     │
│  ☑️ 自动同步 (每 5 分钟)             │
└─────────────────────────────────────┘
```

**自动同步**:

```typescript
// 定期同步
let syncInterval: number | null = null;

function enableAutoSync(intervalMs = 5 * 60 * 1000) {
  syncInterval = setInterval(async () => {
    await mergeFromICloud(); // 先拉取合并，再推送
  }, intervalMs);
}

function disableAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
```

---

### 冲突处理

Loro CRDT 自动处理冲突:

| 冲突类型 | Loro 行为 | 说明 |
|----------|-----------|------|
| 同时添加素材 | 两个都保留 | 无冲突 |
| 同时编辑同一素材 | LWW (Last Write Wins) | 自动合并 |
| 同时删除同一素材 | 删除生效 | 无冲突 |
| 编辑已删除素材 | 删除优先 | 自动处理 |

---

## Embedding 重建策略

由于 embedding 不同步，需要在以下场景重建:

### 1. 同步后重建

```typescript
// 从 iCloud 恢复或合并后，重建缺失的 embedding
async function ensureEmbeddings(materials: RawMaterial[]) {
  const needsEmbedding = materials.filter(m => !m.embedding);
  if (needsEmbedding.length === 0) return;

  for (const material of needsEmbedding) {
    material.embedding = await embed(material.content);
  }

  // 更新本地 embedding 缓存 (不影响 Loro Doc)
  await db.embeddings.bulkPut(
    needsEmbedding.map(m => ({ materialId: m.id, vector: m.embedding }))
  );
}
```

### 2. 按需重建

```typescript
// 语义搜索时，确保相关素材有 embedding
async function semanticSearch(query: string) {
  const queryEmb = await embed(query);
  const materials = getAllMaterials();

  // 加载本地 embedding 缓存
  const embeddings = await db.embeddings.toArray();
  const embMap = new Map(embeddings.map(e => [e.materialId, e.vector]));

  // 生成缺失的 embedding
  for (const m of materials) {
    if (!embMap.has(m.id)) {
      const vector = await embed(m.content);
      embMap.set(m.id, vector);
      await db.embeddings.put({ materialId: m.id, vector });
    }
  }

  return materials
    .map(m => ({ m, score: cosine(queryEmb, embMap.get(m.id)!) }))
    .sort((a, b) => b.score - a.score);
}
```

---

## 数据模型总结

### 同步数据 (Loro Doc → iCloud)

```typescript
// 存入 Loro，参与同步
interface SyncedMaterial {
  id: string;
  type: 'text' | 'image';
  content: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

interface SyncedOutput {
  id: string;
  sessionId: string;
  content: string;
  materialIds: string[];
  createdAt: number;
}

interface SyncedSession {
  id: string;
  status: 'active' | 'completed' | 'abandoned';
  createdAt: number;
  completedAt?: number;
}
```

### 本地数据 (IndexedDB only，不同步)

```typescript
// 本地派生数据，不参与同步
interface LocalEmbedding {
  materialId: string;
  vector: number[];  // 384 维向量
}

interface LocalCluster {
  id: string;
  label?: string;
  centroid: number[];
  materialIds: string[];
}

interface LocalMeta {
  key: string;  // 'loro-snapshot' | 'icloud-handle' | 'last-sync'
  value: any;
}
```

### IndexedDB Schema

```typescript
class EchoDatabase extends Dexie {
  meta!: Dexie.Table<LocalMeta, string>;
  embeddings!: Dexie.Table<LocalEmbedding, string>;
  clusters!: Dexie.Table<LocalCluster, string>;

  constructor() {
    super('echo');
    this.version(1).stores({
      meta: 'key',
      embeddings: 'materialId',
      clusters: 'id',
    });
  }
}
```

---

## 实现路线图

| 阶段 | 目标 | 内容 |
|------|------|------|
| **Phase 1** | Loro + IndexedDB 持久化 | Loro Doc 数据结构 + snapshot 持久化 |
| **Phase 2** | iCloud 同步 | File System Access API + 手动/定期同步 |
| Phase 3 | Mobile 端 | SQLite 存储 + iCloud Drive 原生访问 |

---

## 浏览器兼容性

### File System Access API

| 浏览器 | 支持情况 |
|--------|----------|
| Chrome/Edge | ✅ 完整支持 |
| Safari | ⚠️ 部分支持 (需 macOS 12.2+) |
| Firefox | ❌ 不支持 |

**降级策略**: 不支持时隐藏 iCloud 同步功能，仅使用本地存储。

---

## 参考资料

- [Loro CRDT](https://loro.dev/) - 文档和 API
- [Dexie.js](https://dexie.org/) - IndexedDB wrapper
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)
- [iCloud Drive](https://developer.apple.com/icloud/)
