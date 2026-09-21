# EchoCity · Firebase Realtime Database 节点结构说明

*对应代码框架提案 `claude/echocity-build-plan.md` 目录结构里的 `firebase/database-schema/`。这份文档不是权威定义本身——字段的含义、边界、待定项，权威来源始终是 `claude/echocity-prototype.md` §3（字段级数据结构）与 §3.10（角色权限矩阵）。这里只做一件事：把 §3 里按关系型表设计的结构，翻译成 Realtime Database 的树形节点结构，并说明翻译时做了哪些取舍。带 🔧 的字段/节点是"平台维护团队专属可写"（对应 §1.9.1），具体的读写权限见同目录下的 `database.rules.json`，这份文档只描述"数据长什么样"，不重复描述"谁能读写"。*

*命名约定：延续 §3 的 snake_case 字段命名，顶层节点名同样使用 snake_case，保持和原型文档字段级设计一一对应、便于查阅比对。*

---

## 0. 从关系型表到 RTDB 树：翻译原则

Realtime Database 没有 join、没有外键约束，只有一棵大 JSON 树。把 §3 的关系型表结构搬过来时，遵循三条原则：

1. **每张表 → 一个顶层节点，行的主键 → 该节点下的 key。** 例如 `account` 表的每一行，变成 `accounts/{account_id}` 下的一个对象。
2. **外键关联 → 保留成一个手动维护的引用字段**（不是真正的外键约束，Realtime Database 不校验引用完整性，App 代码需要自己保证一致性）。例如 `workspace.account_id` 在 RTDB 里还是一个普通字符串字段，写入/删除时由 Cloud Functions 或客户端逻辑保证不出现悬空引用。
3. **一对多关系，视频问/写模式决定拆分方式：** 如果"总是连着父记录一起读"（比如某个成员位的 task_log），就嵌套在父节点下；如果"需要被高频单独按 ID 查询、或权限粒度不同"（比如 world_event_participation 需要按 event_id 单独读、且写权限比 world_event 本身更开放），就拆成独立顶层节点、用外键字段关联，避免嵌套过深导致一次读取拉下整棵子树。

这条原则直接对应 §3 每张表的实际读写模式，翻译结果见下方 §1–§9（编号对应 `echocity-prototype.md` §3.1–§3.9；§3.10 权限矩阵的落地在 `database.rules.json`，不在本文档重复）。

---

## 1. 身份层（对应 §3.1）

### `accounts/{account_id}`

```json
{
  "accounts": {
    "<account_id>": {
      "email": "diasy@example.com",
      "activity_score": 0,
      "current_scene_mode": "onsite",
      "current_workspace_id": "<workspace_id>",
      "pet_id": "<pet_id>",
      "created_at": 1758000000000
    }
  }
}
```

- `account_id` 使用 Firebase Authentication 分配的 `uid`，不另外生成主键——这样 `accounts/{uid}` 天然就是"当前登录用户能读写自己这份数据"的判断依据，`database.rules.json` 里直接用 `auth.uid === $account_id` 做校验，不需要额外一层映射。
- `created_at` 用 Unix 毫秒时间戳（`ServerValue.TIMESTAMP` 由服务端在写入时生成），而不是 ISO 字符串——RTDB 排序、索引都基于数值更高效。

### `member_slots/{member_id}`

```json
{
  "member_slots": {
    "<member_id>": {
      "account_id": "<account_id>",
      "nickname": "Mochi Jr.",
      "avatar": "avatar_03",
      "age_band": "child_grade1_2",
      "activity_score": 0,
      "points_balance": 0,
      "task_log": {
        "<task_completion_id>": {
          "card_id": "<card_id>",
          "completed_at": 1758000000000,
          "guardian_confirmed_at": 1758000600000
        }
      }
    }
  }
}
```

- `task_log` 直接嵌套在成员位节点下（不是独立顶层节点）——因为它几乎总是跟着"这个成员位的任务记录"一起被读取（H2③④ 可用性测试要看的正是这份数据），拆开反而要多一次查询。
- 最多 4 个成员位（E2）不在数据结构层面强制——这类"数量上限"校验适合写在 Cloud Functions 的创建成员位接口里，Security Rules 能做但表达笨拙，不在这里重复。

---

## 2. 工作区层（对应 §3.2）

### `workspaces/{workspace_id}`

```json
{
  "workspaces": {
    "<workspace_id>": {
      "account_id": "<account_id>",
      "content_pack_id": "riverside-yard",
      "points_balance": 0,
      "credits_balance": 0,
      "points_daily_used": 0,
      "points_daily_cap": 200,
      "collection_progress": {
        "<anchor_id_or_item_id>": true
      }
    }
  }
}
```

- `points_daily_cap` 是 🔧 字段（§1.9.1 平台维护团队专属可写）——数值本身先用占位值（§1.5 待定 6，等 Diasy 给真实数值），结构已经就位。
- `collection_progress` 用"key 存在即算已收集"的稀疏 map，而不是数组，方便按 `anchor_id` 直接 `O(1)` 判断某一项是否已收集、不用整段拉下来遍历。

---

## 3. 宠物（对应 §3.3）

### `pets/{pet_id}`

```json
{
  "pets": {
    "<pet_id>": {
      "account_id": "<account_id>",
      "species": "mochi",
      "mood_tier": "mid",
      "last_fed_at": 1758000000000,
      "auto_feeder_active_until": null,
      "wandered_off": false,
      "wandered_anchor_id": null,
      "equipped_cosmetics": {
        "<cosmetic_item_id>": { "scope": "global" }
      }
    }
  }
}
```

- `mood_tier` 是计算字段（§3.3 原文说明），但在 RTDB 里不做成"实时函数"，而是由 `generatePetSentences`（每日 cron，见 build-plan §2）在同一批次里顺便重算并写回这个字段——RTDB 没有数据库端计算列，只能选"客户端每次现算"或"后台定时写回缓存值"，选后者是因为 F5 缓存策略本来就要求"预生成 + 不按打开触发"，两件事用同一个 cron 完成，不重复设计。

---

## 4. 内容包 / 锚点（对应 §3.4）

### `content_packs/{content_pack_id}`

```json
{
  "content_packs": {
    "riverside-yard": {
      "display_name": "Riverside Yard",
      "homepage_isometric_map_asset": "https://.../riverside-yard-map.svg"
    }
  }
}
```

### `anchors/{anchor_id}`

```json
{
  "anchors": {
    "<anchor_id>": {
      "content_pack_id": "riverside-yard",
      "zone": "eco",
      "device_type": "solar_pole",
      "scan_target_ref": "qr_solar_pole_01",
      "simulated_data": {
        "kwh_today": 3.2,
        "uptime_pct": 98
      },
      "daily_greeting_text": "The pole has been humming since sunrise today.",
      "daily_greeting_generated_at": 1758000000000
    }
  }
}
```

- `simulated_data` 的字段形状按 `device_type` 变化（§3.4 原文已说明），RTDB 不做 schema 校验，这一点在 Security Rules 里也放开（只校验存在字符串/数字类型，不逐字段枚举），交给 App 层的 TypeScript 类型定义去保证形状正确。

### `story_chapters/{chapter_id}`

```json
{
  "story_chapters": {
    "<chapter_id>": {
      "anchor_id": "<anchor_id>",
      "order_index": 0,
      "body_text": "……",
      "unlock_field": "kwh_today",
      "unlock_threshold": null
    }
  }
}
```

- `unlock_threshold` 暂时留 `null`（§3.4 原文标注"数值待定，另开数值对话"），不编造占位数字——运营专员在拿到真实数值前，前端按"未设置 = 暂不解锁"处理。

---

## 5. 货币配置（对应 §3.5）

### `currency_channel_config/{channel_id}` 🔧

```json
{
  "currency_channel_config": {
    "activity_daily_cap": {
      "currency": "points",
      "cap_type": "fixed_threshold",
      "cap_value": null,
      "active": true
    },
    "collection_milestone": { "currency": "credits", "cap_type": "fixed_threshold", "cap_value": null, "active": true },
    "merchant_cashback": { "currency": "credits", "cap_type": "fixed_threshold", "cap_value": null, "active": true },
    "world_event_pool": { "currency": "credits", "cap_type": "fixed_pool_total", "cap_value": null, "active": true }
  }
}
```

- 四个渠道 key 直接对应 §1.5 定义的四个 Credits 来源 + Points 日上限，`cap_value` 同样留 `null` 占位（§1.5 待定 3–5）。
- 这个节点整体是 🔧——`database.rules.json` 对它的写权限只放给平台维护团队角色，运营专员和普通玩家账号都只读或完全不可读（具体见规则文件里的注释）。

---

## 6. 世界事件（对应 §3.6）

### `world_events/{event_id}`

```json
{
  "world_events": {
    "<event_id>": {
      "content_pack_id": "riverside-yard",
      "starts_at": 1758000000000,
      "ends_at": 1758172800000,
      "landmark_anchor_id": "<anchor_id>",
      "geofence": { "type": "polygon", "coordinates": [[121.5, 31.2], ["..."]] },
      "boss_hp_total": 100000,
      "boss_hp_remaining": 100000,
      "version": 0,
      "settled": false,
      "reward_pool_total": null
    }
  }
}
```

- `boss_hp_remaining` / `version` / `settled` 三个字段是 `hpDecrement` Cloud Function 用 `runTransaction()` 原子更新的目标（build-plan §1、§3 已定）——**这三个字段刻意不开放任何客户端直接写权限**，`database.rules.json` 里对应位置是 `".write": false`，所有伤害提交必须走 callable function，这是把 §5 HP 计数器 spike 验证过的"只允许 settled 从 false 变 true 一次"这条规则，从"算法层面正确"落实成"客户端物理上写不了"，双重保险。
- `reward_pool_total` 是 🔧 字段，占位 `null`（§1.5 待定）。

### `world_event_participation/{event_id}/{member_or_account_id}`

```json
{
  "world_event_participation": {
    "<event_id>": {
      "<member_or_account_id>": {
        "damage_from_minigame": 0,
        "damage_from_activity": 0,
        "eligible_to_attack": false,
        "joined_at": 1758000000000
      }
    }
  }
}
```

- 嵌套在 `event_id` 下（而不是拍平成 `world_event_participation/{id}` 独立记录），是因为最常见的读取模式是"这场事件里所有人的参战记录"（结算、排名都要一次性扫描同一场事件下的所有参与者），嵌套后一次查询就能拿到，不用额外按 `event_id` 过滤。
- `eligible_to_attack` 是计算字段（§3.6 原文：geofence + 罗盘校验的结果），由客户端计算后上报，但**实际是否放行提交伤害，服务端的 `hpDecrement` function 会重新校验一遍位置和朝向，不信任客户端自报的这个字段**——这里存它只是为了 UI 展示"你现在能不能打"，不是安全边界本身。

### `daily_mini_events/{content_pack_id}/{date}`

```json
{
  "daily_mini_events": {
    "riverside-yard": {
      "2026-09-22": {
        "reward": { "points": 20, "activity": 10, "collection_drop": "badge_01" }
      }
    }
  }
}
```

- 按 `content_pack_id` 再按 `date`（`YYYY-MM-DD`）两层嵌套，对应"每个园区每天一条"的语义（N1 已确认），日期用字符串而不是时间戳，方便直接按字典序范围查询某个月的记录。

---

## 7. AI 翻译层缓存（对应 §3.7）

### `pet_status_sentences/{pet_id}`

```json
{
  "pet_status_sentences": {
    "<pet_id>": {
      "generated_date": "2026-09-22",
      "low": "……",
      "mid": "……",
      "high": "……"
    }
  }
}
```

- §3.7 原表按 `(pet_id, mood_tier, generated_date)` 三元组存每一条，这里合并成"每只宠物一个节点、三档文本 + 生成日期"——因为凌晨 cron 每天整批重新生成三档文本，旧的一天文本不需要保留历史（不是需要按天回溯查询的数据），合并后每次覆写整节点，比维护一堆按日期分叉的历史记录更简单，且读取时（App 打开时按 `mood_tier` 取一条）少一次按日期过滤的逻辑。

### `anchor_daily_greeting`

不单独建节点——`daily_greeting_text` / `daily_greeting_generated_at` 已经是 `anchors/{anchor_id}` 节点上的两个字段（见 §4），今日回响本质上是锚点的一个每日刷新属性，不是独立实体，不需要拆开。

---

## 8. 商户与核销（对应 §3.8）

### `merchants/{merchant_id}`

```json
{
  "merchants": {
    "<merchant_id>": {
      "content_pack_id": "riverside-yard",
      "discount_config": { "type": "flat", "value": null }
    }
  }
}
```

### `redemption_records/{redemption_id}`

```json
{
  "redemption_records": {
    "<redemption_id>": {
      "workspace_id": "<workspace_id>",
      "merchant_id": "<merchant_id>",
      "credits_spent": 10,
      "qr_token": "……",
      "redeemed_at": null
    }
  }
}
```

- `redeemed_at` 写入 `null` 表示"已生成二维码、还没被商户端核销"，商户端网页扫码后由 Cloud Function 写入真实时间戳并原子扣减对应 `workspaces/{id}/credits_balance`——核销这一步同样不开放客户端直接写 `redeemed_at`，避免玩家自己伪造"已核销"状态。

---

## 9. 儿童任务卡（对应 §3.9）

### `kid_task_templates/{template_id}`（引擎共享模板）

```json
{
  "kid_task_templates": {
    "<template_id>": { "text_template": "Water the plants near {anchor_name}", "age_band_tag": "child_grade1_2" }
  }
}
```

### `kid_task_cards/{content_pack_id}/{card_id}`（内容包专属）

```json
{
  "kid_task_cards": {
    "riverside-yard": {
      "<card_id>": { "template_id": "<template_id>", "custom_text": null }
    }
  }
}
```

### `kid_task_completions/{member_id}/{card_id}`

```json
{
  "kid_task_completions": {
    "<member_id>": {
      "<card_id>": { "guardian_confirmed_at": null }
    }
  }
}
```

- 拆成独立节点（而不是并进 `member_slots/{id}/task_log`）是因为它和 §3.1 的 `task_log`（"完成过的任务卡记录"）其实是同一份数据的两种视角——为避免维护两份真相，`task_log` 在实现时会是 `kid_task_completions/{member_id}` 的一个只读投影（前端订阅这个节点即可），§3.1 的 JSON 示例里出现的 `task_log` 结构，落地时就是这个节点，不重复存储。

---

## 10. 内部角色（Security Rules 用，不对应 §3 任何一张表）

### `staff_roles/{uid}`

```json
{
  "staff_roles": {
    "<uid>": "platform_maintainer"
  }
}
```

- §3 的字段级数据结构里没有这张"表"，因为它不是产品数据，是纯粹为了在 Security Rules 里判断"这个登录用户是不是平台维护团队 / 运营专员 / 宣传部门"而新增的内部节点（对应 §1.9.1 三方分工、§3.10 权限矩阵）。
- 三个角色值：`platform_maintainer` / `operations_specialist` / `publicity`；不在这个节点里出现的 `uid`，一律按普通玩家账号处理。
- **这个节点本身对所有客户端不可读、不可写**（见 `database.rules.json`），只能通过 Firebase 控制台或 Admin SDK（Cloud Function、或 Diasy 在控制台里手动添加）写入——三个内部角色目前还没有账号分配（不在 demo 范围内自动生成），等运营框架文档真正需要演示角色分权时再手动加测试账号，见 build-plan 阶段 5。

---

## 11. 与 §3 的差异对照表（便于核对没有遗漏字段）

| §3 表名 | RTDB 节点 | 结构性差异 |
|---|---|---|
| account | `accounts/{uid}` | 主键改用 Firebase Auth uid，其余字段一一对应 |
| member_slot | `member_slots/{id}` | `task_log` 改为对 `kid_task_completions/{member_id}` 的只读投影，见 §9 |
| workspace | `workspaces/{id}` | 无结构性差异，字段一一对应 |
| pet | `pets/{id}` | `mood_tier` 由每日 cron 写回而非实时计算，见 §3 |
| content_pack | `content_packs/{id}` | 无差异 |
| anchor | `anchors/{id}` | 无差异 |
| story_chapter | `story_chapters/{id}` | 无差异 |
| currency_channel_config | `currency_channel_config/{id}` | 无差异 |
| world_event | `world_events/{id}` | `boss_hp_remaining`/`version`/`settled` 客户端零写权限，见 §6 |
| world_event_participation | `world_event_participation/{event_id}/{member_id}` | 嵌套进 event_id 下，非独立拍平节点 |
| daily_mini_event | `daily_mini_events/{content_pack_id}/{date}` | 两层嵌套代替单表 |
| pet_status_sentence | `pet_status_sentences/{pet_id}` | 三档 + 生成日期合并进单节点，不按日期分叉保留历史 |
| anchor_daily_greeting | 并入 `anchors/{id}` 字段 | 不独立建节点 |
| merchant | `merchants/{id}` | 无差异 |
| redemption_record | `redemption_records/{id}` | `redeemed_at` 客户端零写权限 |
| kid_task_template | `kid_task_templates/{id}` | 无差异 |
| kid_task_card | `kid_task_cards/{content_pack_id}/{id}` | 无差异（表结构本就按 content_pack 分） |
| kid_task_completion | `kid_task_completions/{member_id}/{card_id}` | 无差异 |
| （无对应） | `staff_roles/{uid}` | 新增节点，仅供 Security Rules 判断角色用，见 §10 |

*没有遗漏字段；所有结构性差异都是"关系型 → 树形"翻译的直接后果，不改变任何字段的产品含义。数值类待定字段（`cap_value`、`unlock_threshold`、`reward_pool_total`）统一用 `null` 占位，等 Diasy 提供真实数值后由运营专员通过后台或直接改这几个节点填入，不需要改 Security Rules 或前端代码。*
