// 运行时按 content_pack_id 拉取对应内容包数据 —— 骨架阶段内容包只有一个
// (riverside-yard)，数据以静态 JSON 形式存在 /content-packs 下（对应 build-plan §2
// 目录结构：内容包是数据不是代码，新增园区 = 新增文件夹，不改这里的代码）。
// 后续阶段如果要让运营专员在后台直接改内容包数据，这里替换成读 Firebase
// content_packs / anchors 节点即可，调用方（screens）不需要跟着改。
import anchorsData from "../../../../content-packs/riverside-yard/anchors.json";
import contentPackMeta from "../../../../content-packs/riverside-yard/content-pack.json";
import type { Anchor } from "../engine/ai-translation/types";

export interface ContentPackMeta {
  content_pack_id: string;
  display_name: string;
  homepage_isometric_map_asset: string;
  zones: string[];
}

const packs: Record<string, { meta: ContentPackMeta; anchors: Record<string, Anchor> }> = {
  "riverside-yard": {
    meta: contentPackMeta as ContentPackMeta,
    anchors: anchorsData as unknown as Record<string, Anchor>,
  },
};

export function loadContentPack(contentPackId: string) {
  return packs[contentPackId] ?? null;
}

export function loadAnchor(contentPackId: string, anchorId: string): Anchor | null {
  return packs[contentPackId]?.anchors[anchorId] ?? null;
}

export function listAvailableContentPacks(): ContentPackMeta[] {
  return Object.values(packs).map((p) => p.meta);
}
