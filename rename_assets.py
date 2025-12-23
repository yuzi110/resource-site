
import os

# 目录路径
ASSETS_DIR = r"D:\Projects\zyjhz\resource-site\downloaded_assets\Kenney_2D"

# 映射表：文件名 -> 中文名
RENAME_MAP = {
    "kenney_rpg-base.zip": "01_RPG基础开发全套素材.zip",
    "kenney_platformer-art-pixel-redux.zip": "02_高清像素横版闯关素材.zip",
    "kenney_ui-pack.zip": "03_通用游戏UI界面包_基础版.zip",
    "kenney_ui-pack-rpg-expansion.zip": "04_RPG专用UI扩展包.zip",
    "kenney_fantasy-ui-borders.zip": "05_奇幻风格UI边框纹理.zip",
    "kenney_pixel-platformer.zip": "06_经典像素跳跃游戏素材.zip",
    "kenney_tiny-dungeon.zip": "07_微缩地牢像素素材.zip",
    "kenney_tiny-town.zip": "08_微缩城镇像素素材.zip",
    "kenney_roguelike-caves-dungeon.zip": "09_Roguelike洞穴地牢素材.zip",
    "kenney_roguelike-modern-city.zip": "10_现代城市街区素材.zip",
    # 顺便把 Itch 的几个也加上，以防万一你放进去了
    "Modern_Interiors_Free_v2.2.zip": "11_现代室内精装修素材.zip",
    "0x72_16x16DungeonTileset.v5.zip": "12_复古地牢全套图块.zip"
}

def rename_files():
    if not os.path.exists(ASSETS_DIR):
        print(f"错误：目录不存在 {ASSETS_DIR}")
        return

    print("=== 开始批量重命名 ===")
    count = 0
    for filename in os.listdir(ASSETS_DIR):
        if filename in RENAME_MAP:
            old_path = os.path.join(ASSETS_DIR, filename)
            new_path = os.path.join(ASSETS_DIR, RENAME_MAP[filename])
            try:
                os.rename(old_path, new_path)
                print(f"✅ [成功] {filename} -> {RENAME_MAP[filename]}")
                count += 1
            except Exception as e:
                print(f"❌ [失败] {filename}: {e}")
        else:
            # 如果是不在映射表里的文件，打印出来看看
            if filename.endswith(".zip"):
                print(f"⚠️ [跳过] 未知文件: {filename}")

    print(f"\n共重命名 {count} 个文件。")

if __name__ == "__main__":
    rename_files()
