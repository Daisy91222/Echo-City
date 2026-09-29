// 运行时按 content_pack_id 拉取对应内容包数据 —— 骨架阶段内容包只有一个
// (riverside-yard)，数据以静态 JSON 形式存在 /content-packs 下（对应 build-plan §2
// 目录结构：内容包是数据不是代码，新增园区 = 新增文件夹，不改这里的代码）。
// 后续阶段如果要让运营专员在后台直接改内容包数据，这里替换成读 Firebase
// content_packs / anchors 节点即可，调用方（screens）不需要跟着改。
import anchorsData from "../../../../content-packs/riverside-yard/anchors.json";
import contentPackMeta from "../../../../content-packs/riverside-yard/content-pack.json";
import merchantsData from "../../../../content-packs/riverside-yard/merchants.json";
// 阶段 5 新增第二个内容包 the-room——按 build-plan §2 目录结构的原意，新增园区本该
// 只是"新增文件夹"；但这个 packs 注册表目前仍需要在这里手动加一条 import + 一条
// 记录（不是完全零代码改动）。这是 content-loader（不在 engine/ 目录下）而非
// engine 本身的一处已知实现细节，已如实记入 build-plan.md，不掩饰成"全自动发现"。
import theRoomAnchorsData from "../../../../content-packs/the-room/anchors.json";
import theRoomContentPackMeta from "../../../../content-packs/the-room/content-pack.json";
import theRoomMerchantsData from "../../../../content-packs/the-room/merchants.json";
import type { Anchor } from "../engine/ai-translation/types";
import type { Merchant } from "../engine/collection/types";

export interface ContentPackMeta {
  content_pack_id: string;
  display_name: string;
  homepage_isometric_map_asset: string;
  zones: string[];
}

const packs: Record<
  string,
  { meta: ContentPackMeta; anchors: Record<string, Anchor>; merchants: Record<string, Merchant> }
> = {
  "riverside-yard": {
    meta: contentPackMeta as ContentPackMeta,
    anchors: anchorsData as unknown as Record<string, Anchor>,
    merchants: merchantsData as unknown as Record<string, Merchant>,
  },
  "the-room": {
    meta: theRoomContentPackMeta as ContentPackMeta,
    anchors: theRoomAnchorsData as unknown as Record<string, Anchor>,
    merchants: theRoomMerchantsData as unknown as Record<string, Merchant>,
  },
};

export function loadContentPack(contentPackId: string) {
  return packs[contentPackId] ?? null;
}

export function loadAnchor(contentPackId: string, anchorId: string): Anchor | null {
  return packs[contentPackId]?.anchors[anchorId] ?? null;
}

export function listAnchors(contentPackId: string): Anchor[] {
  return Object.values(packs[contentPackId]?.anchors ?? {});
}

export function listMerchants(contentPackId: string): Merchant[] {
  return Object.values(packs[contentPackId]?.merchants ?? {});
}

export function loadMerchant(contentPackId: string, merchantId: string): Merchant | null {
  return packs[contentPackId]?.merchants[merchantId] ?? null;
}

export function listAvailableContentPacks(): ContentPackMeta[] {
  return Object.values(packs).map((p) => p.meta);
}
