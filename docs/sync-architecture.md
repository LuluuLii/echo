# Echo 同步架构设计

> 更新时间: 2026-02-24

## 概述

本文档描述 Echo 的数据持久化和多端同步架构。

**核心架构**:
- **iCloud Drive 文件** 为主存储（当已连接时）
- **IndexedDB** 为缓存和离线备份
- **localStorage** 为紧急备份（页面关闭时）
- **Loro CRDT** 处理多端合并冲突

```
存储优先级:
  Primary:   iCloud Drive/Echo/echo-data.loro (当已连接)
  Cache:     IndexedDB (始终保存)
  Backup:    localStorage (beforeunload 时)

数据流:
  用户操作 → Loro Doc → 同时写入 iCloud + IndexedDB
```

## 设计原则

### 1. iCloud 优先，IndexedDB 缓存

- **加载顺序**: iCloud → IndexedDB → localStorage
- **保存策略**: 同时写入 iCloud + IndexedDB（双写）
- 确保用户数据在 iCloud 中有可靠备份

### 2. 离线优先

所有核心功能在离线时 100% 可用：
- 未连接 iCloud 时使用 IndexedDB
- 下次连接 iCloud 时自动同步

### 3. 自动同步

- **定时同步**: 每 5 分钟自动合并 iCloud 数据
- **退出同步**: 页面关闭前尝试同步到 iCloud
- **紧急备份**: beforeunload 时保存到 localStorage

### 4. 用户数据自主

- 数据存储在用户自己的 iCloud 中
- 不依赖第三方服务器
- 用户完全控制自己的数据

### 5. Embedding 本地生成，不同步

**关键决策**: Embedding 向量不参与同步。

| 理由 | 说明 |
|------|------|
| **可重建性** | Embedding 可以根据素材内容随时重新生成 |
| **向量维度高** | all-MiniLM-L6-v2 产生 384 维向量，每条素材约 1.5KB |
| **节省同步带宽** | 100 条素材的 embedding 约 150KB，无需同步 |
| **模型版本问题** | 不同端可能使用不同版本模型，向量不兼容 |

**策略**: 每个端独立计算 embedding，同步新素材后本地重建。

---

## 数据存储结构

### 同步数据 (Loro Doc → iCloud)

```
loro-snapshot (二进制 Uint8Array)
  ├── materials       (素材)
  ├── artifacts       (表达产出)
  ├── sessions        (练习记录)
  ├── sessionMemories (会话记忆)
  ├── userProfile     (用户档案)
  ├── learningState   (学习状态)
  ├── topicProficiency(主题熟练度)
  ├── growthEvents    (成长事件)
  ├── userUtterances  (用户表达)
  ├── vocabularyRecords(词汇记录)
  ├── projects        (项目)
  └── tasks           (任务)
```

### 本地数据 (IndexedDB only，不同步)

```typescript
// IndexedDB "echo" 数据库
{
  meta: {
    'loro-snapshot': Uint8Array,    // Loro 快照缓存
    'icloud-handle': FileSystemHandle, // iCloud 文件夹句柄
    'last-sync': number              // 最后同步时间
  },
  embeddings: {
    [materialId]: {
      vector: number[],   // 384 维向量
      updatedAt: number
    }
  }
}
```

---

## 实现细节

### 初始化流程 (initLoro)

```typescript
export async function initLoro(): Promise<{
  source: 'icloud' | 'indexeddb' | 'localstorage' | 'empty';
}> {
  // 1. 尝试从 iCloud 加载（如已连接且有权限）
  if (iCloudConnected) {
    const snapshot = await loadFromICloud();
    if (snapshot) {
      doc.import(snapshot);
      return { source: 'icloud' };
    }
  }

  // 2. 回退到 IndexedDB
  const indexedDBSnapshot = await loadSnapshot();
  if (indexedDBSnapshot) {
    doc.import(indexedDBSnapshot);
    // 如果 iCloud 已连接，同步本地数据到 iCloud
    if (iCloudConnected) {
      await saveToICloud(snapshot);
    }
    return { source: 'indexeddb' };
  }

  // 3. 回退到 localStorage 备份
  const backupStr = localStorage.getItem('echo-loro-backup');
  if (backupStr) {
    const backup = new Uint8Array(JSON.parse(backupStr));
    doc.import(backup);
    return { source: 'localstorage' };
  }

  return { source: 'empty' };
}
```

### 保存流程 (persistNow)

```typescript
export async function persistNow(): Promise<void> {
  const snapshot = doc.export({ mode: 'snapshot' });

  // 始终保存到 IndexedDB（缓存）
  await saveSnapshot(snapshot);

  // 如果 iCloud 已连接，同时保存到 iCloud（主存储）
  if (iCloudConnected) {
    await saveToICloud(snapshot);
  }
}
```

### 自动同步

```typescript
// App.tsx 中启用
useEffect(() => {
  // 每 5 分钟自动同步
  enableAutoSync(5 * 60 * 1000);

  // 页面关闭前同步
  setupBeforeUnloadSync();
}, []);

// 自动同步实现
export function enableAutoSync(intervalMs = 5 * 60 * 1000): void {
  setInterval(async () => {
    const status = await getICloudStatus();
    if (status.connected && status.hasPermission) {
      await mergeFromICloud(); // 拉取、合并、推送
    }
  }, intervalMs);
}
```

### 退出同步

```typescript
export function setupBeforeUnloadSync(): void {
  window.addEventListener('beforeunload', () => {
    // 尝试同步到 iCloud
    syncToICloud().catch(() => {});

    // 紧急备份到 localStorage
    const snapshot = doc.export({ mode: 'snapshot' });
    localStorage.setItem('echo-loro-backup', JSON.stringify([...snapshot]));
  });
}
```

---

## 跨端同步架构

```
┌──────────────────┐              ┌──────────────────┐
│  iOS App (Swift) │              │   Web App (PC)   │
│  ┌────────────┐  │              │  ┌────────────┐  │
│  │ loro-swift │  │              │  │ loro-crdt  │  │
│  └─────┬──────┘  │              │  └─────┬──────┘  │
│        │         │              │        │         │
│        ▼         │              │        ▼         │
│  ┌────────────┐  │              │  ┌────────────┐  │
│  │FileManager │  │              │  │ IndexedDB  │  │
│  │ (自动同步) │  │              │  │  (缓存)    │  │
│  └─────┬──────┘  │              │  └─────┬──────┘  │
└────────┼─────────┘              └────────┼─────────┘
         │                                  │
         │ 自动                             │ File System
         │                                  │ Access API
         ▼                                  ▼
┌─────────────────────────────────────────────────────┐
│                   iCloud Drive                       │
│                                                      │
│   /Echo/echo-data.loro  (Loro CRDT 二进制快照)       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### iOS 端 (Swift)

```swift
import Loro

// 获取 iCloud 路径
let iCloudURL = FileManager.default
    .url(forUbiquityContainerIdentifier: nil)?
    .appendingPathComponent("Documents/echo-data.loro")

// 读取
let data = try Data(contentsOf: iCloudURL)
let doc = LoroDoc()
doc.import(data)

// 写入（系统自动同步到 iCloud）
let snapshot = doc.export(mode: .snapshot)
try snapshot.write(to: iCloudURL)
```

### Web 端

使用 File System Access API 访问 iCloud Drive 文件夹：
- 用户选择 iCloud Drive/Echo 文件夹
- 存储文件夹句柄到 IndexedDB
- 后续访问使用缓存的句柄

---

## 冲突处理

Loro CRDT 自动处理冲突：

| 冲突类型 | Loro 行为 | 说明 |
|----------|-----------|------|
| 同时添加素材 | 两个都保留 | 无冲突 |
| 同时编辑同一素材 | LWW (Last Write Wins) | 自动合并 |
| 同时删除同一素材 | 删除生效 | 无冲突 |
| 编辑已删除素材 | 删除优先 | 自动处理 |

---

## JSON 导出功能

支持导出为 JSON 格式，用于备份和迁移：

```typescript
export function exportAsJSON(): Record<string, unknown> {
  const doc = getDoc();
  return {
    materials: doc.getMap('materials').toJSON(),
    artifacts: doc.getMap('artifacts').toJSON(),
    sessions: doc.getMap('sessions').toJSON(),
    // ... 其他数据
    exportedAt: new Date().toISOString(),
    version: 1,
  };
}
```

---

## 浏览器兼容性

### File System Access API

| 浏览器 | 支持情况 |
|--------|----------|
| Chrome/Edge | ✅ 完整支持 |
| Safari | ⚠️ 部分支持 (需 macOS 12.2+) |
| Firefox | ❌ 不支持 |

**降级策略**: 不支持时使用纯 IndexedDB 存储，iCloud 同步功能隐藏。

---

## 参考资料

- [Loro CRDT](https://loro.dev/) - 文档和 API
- [loro-swift](https://github.com/loro-dev/loro-swift) - Swift 绑定
- [Dexie.js](https://dexie.org/) - IndexedDB wrapper
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)
- [iCloud Drive](https://developer.apple.com/icloud/)
