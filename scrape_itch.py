
import os
import requests
import re
import time
from bs4 import BeautifulSoup

# 配置下载目录
DOWNLOAD_DIR = os.path.join(os.getcwd(), 'downloaded_assets', 'Itch_IO')
if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Referer": "https://itch.io/"
}

# Itch.io 的免费资产通常在页面底部有一个 "Download" 按钮，点击后会跳到一个捐赠页面 "No thanks, just take me to the downloads"
# 然后才是真实的文件列表页。
# 为了简化，我们手动收集了几个热门包的“文件列表页”或者直接尝试解析。

# 这里列出的是“点击 Download”后的页面 URL (通常包含 /download/ )
TARGET_URLS = [
    # Modern Interiors (LimeZu)
    "https://limezu.itch.io/moderninteriors",
    # Sunny Land (Ansimuz)
    "https://ansimuz.itch.io/sunny-land",
    # 16x16 Dungeon (0x72)
    "https://0x72.itch.io/16x16-dungeon-tileset",
    # Pixel Adventure 1 (Pixel Frog)
    "https://pixel-frog.itch.io/pixel-adventure-1",
    # Free Pixel Art UI (Pimen)
    "https://pimen.itch.io/free-pixel-art-ui"
]

def get_csrf_token(soup):
    token = soup.find('meta', {'name': 'csrf_token'})
    if token:
        return token['content']
    return None

def download_from_itch(page_url):
    print(f"正在分析页面: {page_url}")
    try:
        s = requests.Session()
        s.headers.update(HEADERS)

        # 1. 访问主页
        r = s.get(page_url)
        soup = BeautifulSoup(r.text, 'html.parser')

        # 2. 找到 Download 按钮对应的 Game ID 或上传 ID
        # Itch.io 的下载逻辑比较复杂，通常涉及 POST 请求
        # 很多页面有一个 "Download" 按钮，指向 /game/download/ID

        # 尝试找到 "Download" 按钮
        download_btn = soup.find('a', class_='download_btn')
        if not download_btn:
             # 有些页面可能直接列出了 uploads
             print("  [提示] 未找到直接下载按钮，尝试查找 uploads...")

        # 模拟点击下载，通常会跳到捐赠页，或者直接显示 uploads
        # 这里我们无法完美模拟整个流程，因为涉及到 CSRF 和动态加载

        # 备选方案：打印出提示，让用户手动下载
        print(f"  [!] Itch.io 防爬机制较严，建议手动下载: {page_url}")
        print("  (点击页面上的 'Download' -> 'No thanks, just take me to the downloads')")

        # 尝试获取 uploads 列表 (如果页面公开了)
        uploads = soup.find_all('div', class_='upload')
        if uploads:
            for up in uploads:
                name = up.find('strong', class_='name').text.strip()
                print(f"    - 发现文件: {name}")

    except Exception as e:
        print(f"  [失败] {e}")

if __name__ == "__main__":
    print("=== Itch.io 精选素材下载助手 ===")
    print("注意：Itch.io 的下载链接包含动态 Token，脚本难以直接下载。")
    print("本脚本将生成一个【下载清单.txt】，请您打开链接手动下载（这是最快的方式）。")
    print("-" * 50)

    links_text = ""
    for url in TARGET_URLS:
        print(f"加入清单: {url}")
        links_text += f"{url}\n"

    save_path = os.path.join(DOWNLOAD_DIR, '请手动下载这些神级包.txt')
    with open(save_path, 'w', encoding='utf-8') as f:
        f.write("请复制以下链接到浏览器，点击 Download -> No thanks -> 下载 zip 文件\n\n")
        f.write(links_text)

    print("-" * 50)
    print(f"清单已生成: {save_path}")
    print("去吧老板，这 5 个包手动下一下也就 2 分钟的事！")
