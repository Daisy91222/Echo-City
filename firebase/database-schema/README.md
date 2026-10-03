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
- **2026-10-03 家庭成员位功能落地说明**：`accounts/{account_id}` 上新增两个可选字段，没有改 `.validate`（它只 `hasChildren()` 查必填字段，不限制额外字段）：`current_member_id`（当前以谁的身份在玩，`null`/不存在 = 监护人本人，否则是下面某个 `member_id`——纯 UI 层标记，不是认证边界，demo 里孩子始终用监护人的 `auth.uid` 写数据）；`member_slot_ids`（`{member_id: true}` 稀疏 map，账号到成员位的反向索引）。加反向索引的原因：`member_slots` 顶层节点没有开 `.read`（只在 `$member_id` 这一层按 `account_id` 校验），RTDB 的 `orderByChild` 查询在顶层没有 `.read` 时会被直接拒绝、不会按子节点规则做部分过滤（规则不是过滤器，是 RTDB 一个有名的坑）——所以只能反向索引 + 按 id 逐个读取，不能指望一次查询把"我账号下所有成员位"全部查出来。

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
- **2026-09-28 阶段 4（陪伴细化）落地说明**：`auto_feeder_active_until`/`wandered_off`/`wandered_anchor_id` 三个字段在 §3.3 草稿阶段就已经列出，本阶段是第一次真正被代码读写（`engine/companion/feeding.ts`/`wander.ts`）。三者都延续阶段 0/1 就定下的信任边界——客户端直写、Security Rules 只锁 `mood_tier`，不需要为这几个字段新增规则或 Cloud Function（出走判定、投喂、找回全部是客户端算好直接 `set()`/`runTransaction()`，没有服务端二次校验，和阶段 2/3 其余字段的简化程度一致，不是新降低的标准）。出走触发阈值（`WANDER_THRESHOLD_HOURS`，占位 72）、叫回花费（`POINTS_RECALL_COST`，占位 15）、自动喂食器价格与时长（`AUTO_FEEDER_COST_CREDITS`/`AUTO_FEEDER_DURATION_HOURS`，占位 30 Credits / 24h）均为占位数值，等 Diasy"数值对话"再定。专注计时（D1 番茄钟）本身不落库到 `pets` 节点，只在完成时给 `accounts/{account_id}/activity_score` 加一次固定值（`ACTIVITY_PER_FOCUS_SESSION`，占位 10），时长常量 `FOCUS_SESSION_SECONDS` demo 阶段故意设得很短（120 秒）方便 Diasy 一次测试内验证完整链路，量产阶段改回 25 分钟即可，见 `engine/companion/focus.ts` 顶部注释。

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
- **2026-09-29 阶段 5 新增第二个内容包 `the-room`**（4 个锚点：台灯/落地灯/书/对联，对应 `claude/echocity-prototype.md` B2 的映射），证明这里描述的节点结构对任何内容包都成立，不是只为 `riverside-yard` 量身定制。`device_type` 在代码里是纯字符串（`Anchor.device_type: string`），the-room 用了几个新的字符串值（`table_lamp`/`floor_lamp`/`interactive_book`/`couplet_scroll`），不需要改任何 TypeScript 类型或 Security Rules。

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

- `boss_hp_remaining` / `version` / `settled` 三个字段最初的设计（如上一段）是给 `hpDecrement` Cloud Function 用 `runTransaction()` 原子更新，客户端零写权限。**2026-09-24 阶段 2 开工前这处设计已被推翻**：升级 Firebase Blaze 付费计划 + 部署 Cloud Functions 的成本超出"只考虑 demo 呈现简易性"的标准（Diasy 经 AskUserQuestion 确认），改为**客户端直连 + Security Rules 校验**——三个字段各自单独走 `runTransaction()`（不是整个 event 对象一次性事务，2026-09-25 修过一次这个实现细节，见 `journal.md`），`database.rules.json` 里对应位置从 `".write": false` 改成"自写 + 校验单调递减/递增/只能 false→true 一次"。§5 HP 计数器 spike 验证过的算法逻辑不变，只是把"由谁执行这个事务"从服务端换成了客户端，双重保险因此变成单保险（少了一层"客户端物理上写不了"），这是本节此前没有同步更新的一处文档滞后，2026-09-27 阶段 3 开工前发现并改正，具体已在 `claude/echocity-build-plan.md` §3 阶段 2 行完整记录。
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

- `redeemed_at` 写入 `null` 表示"已生成二维码、还没被商户端核销"。最初的设计（同上一段）是商户端网页扫码后由 Cloud Function 写入真实时间戳，客户端零写权限。**2026-09-27 阶段 3 开工时，这处设计与阶段 2 已经推翻 Cloud Functions 的决定不一致**——经与 Diasy 确认（AskUserQuestion），**demo 阶段不做真实核销校验**：`redeemed_at` 改为客户端直接可写（`database.rules.json` 对应位置从 `".write": false` 改成 `"auth != null"`），商户端扫码页面本质上只是同一个 App 里的一个页面（复用登录态，不区分"这是不是真的商户账号"），玩家理论上可以自己把自己的记录标记成已核销——这是一处明确记录的简化，不是疏漏，量产阶段需要补回服务端校验（Cloud Function 或独立商户后台 + 角色校验）才能真正杜绝伪造。信用扣减（`credits_spent`）发生在生成兑换记录那一步，不是核销那一步，核销只影响这条记录本身的状态，不涉及二次扣款，避免了"伪造核销"这个简化连带影响余额安全。

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
- **2026-10-03 落地说明（偏离本节原设计的两处）**：① `kid_task_templates`/`kid_task_cards` 这两个节点的 `database.rules.json` 写权限锁给了运营专员，但 demo 阶段没有运营专员账号（§1.9.1、`staff_roles` 对所有客户端零读写），实际写不进去——改为和 `anchors`/`merchants` 同一套做法，走静态内容包文件（`content-packs/shared/kid-task-templates.json` 引擎共享模板 + `content-packs/{pack}/kid-task-cards.json` 内容包专属任务卡），不走 Firebase。这两个 Firebase 节点因此和 `content_packs`/`anchors` 节点一样，是规则文件里写好但实际未被代码使用的节点，不是新引入的不一致。② `kid_task_completions/{member_id}/{card_id}` 原设计 `completed_at`（孩子完成）与 `guardian_confirmed_at`（家长确认）是两步、暗含"孩子自己先写一步"——但孩子在这个 demo 里不单独持有设备/账号（L-4.0），"发卡 → 手机收起 → 家长确认"的真实流程里，掏出手机操作的始终是监护人本人、同一个 `auth.uid`，不存在两个独立的写权限主体。`database.rules.json` 原规则也只给 `guardian_confirmed_at` 单独开过写权限，`card_id`/`completed_at` 连 `$card_id` 这一层的 `.write` 都没有——这是此前从未被代码真正写过才没暴露的一处规则缺口，2026-10-03 落地时发现并在 `$card_id` 层补了一条覆盖整条记录的写权限（同一个监护人校验），两步合并成监护人一次"Confirm completed"操作同时写三个字段。

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

**2026-09-29 补记（阶段 5 · 运营后台第一次真正读写这几个节点）**：`currency_channel_config`（§5）与 `merchants`（§8）这两个节点的权限规则从阶段 0 建库起就写好了，但在阶段 5 之前从未被任何界面真正读写过——App 其余部分（Redemption/C2、Collection/C1 等）读的都是 `content-loader` 里的静态内容包 JSON，不读这两个 Firebase 实时节点。阶段 5 新增的运营后台（`/ops` 路由）是第一次真正用真实登录账号去触碰它们，验证"平台维护团队改得了 Credits 渠道上限、运营专员改不了；运营专员改得了商户折扣、平台维护团队反而不在这条规则的写权限里"这条 §1.9.1 分权设计成立。要让这两个对比效果真的显现，Diasy 需要先在 Firebase 控制台的 Realtime Database **数据**面板（不是 Rules 面板）手动给至少一个测试账号的 uid 写入 `staff_roles/{uid} = "platform_maintainer"`（可选再建一个 `"operations_specialist"` 账号对比），这是一次性的手动步骤，和"改完 rules.json 要 Publish"是两件不同的事——这次改的是数据，不是规则，规则本身在阶段 0 就已写好，具体是否已经 Publish 生效需要 Diasy 确认（见 build-plan §4）。

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
| redemption_record | `redemption_records/{id}` | `redeemed_at` 2026-09-27 起改为客户端可写一次（demo 简化，不做真实核销校验），见 §8——此前这行仍写着旧版"客户端零写权限"，是一处文档漂移，阶段 5 顺手发现并修正 |
| kid_task_template | `kid_task_templates/{id}` | 无差异 |
| kid_task_card | `kid_task_cards/{content_pack_id}/{id}` | 无差异（表结构本就按 content_pack 分） |
| kid_task_completion | `kid_task_completions/{member_id}/{card_id}` | 无差异 |
| （无对应） | `staff_roles/{uid}` | 新增节点，仅供 Security Rules 判断角色用，见 §10 |

*没有遗漏字段；所有结构性差异都是"关系型 → 树形"翻译的直接后果，不改变任何字段的产品含义。数值类待定字段（`cap_value`、`unlock_threshold`、`reward_pool_total`）统一用 `null` 占位，等 Diasy 提供真实数值后由运营专员通过后台或直接改这几个节点填入，不需要改 Security Rules 或前端代码。*
