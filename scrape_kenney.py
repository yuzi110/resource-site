
import os
import requests
import re
from bs4 import BeautifulSoup
import time
import urllib.request

# 配置下载目录
DOWNLOAD_DIR = os.path.join(os.getcwd(), 'downloaded_assets', 'Kenney_2D')
if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

# Kenney 的资产页面改版了，我们尝试从分类页获取
# 或者直接遍历已知的热门包列表（更稳妥）
# 这里我们尝试访问主资源页并筛选
BASE_URL = "https://kenney.nl/assets"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def get_asset_links():
    print("正在获取 Kenney 资产列表...")
    try:
        response = requests.get(BASE_URL, headers=HEADERS)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        links = []
        # Kenney 网站结构：找到所有指向 /assets/xxx 的链接
        # 我们可以根据链接文本或者父元素来判断是否是 2D
        # 由于无法直接筛选 2D，我们先获取所有，然后在详情页判断或者只下载特定的包

        # 查找所有 class="game" 的链接 (这是 Kenney 展示资产卡片的样式)
        for a_tag in soup.find_all('a', class_='game'):
            href = a_tag.get('href')
            if href and href.startswith('/assets/'):
                full_link = f"https://kenney.nl{href}"
                if full_link not in links:
                    links.append(full_link)

        # 如果没有找到 class='game'，尝试通用查找
        if not links:
             for a_tag in soup.find_all('a', href=True):
                href = a_tag['href']
                if href.startswith('/assets/') and len(href.split('/')) == 3: # 排除 /assets/category/xxx
                    full_link = f"https://kenney.nl{href}"
                    if full_link not in links:
                        links.append(full_link)

        print(f"找到 {len(links)} 个资产包链接（包含2D/3D/Audio等）。")
        return links
    except Exception as e:
        print(f"获取列表失败: {e}")
        return []

def download_asset(url):
    try:
        # 1. 访问详情页
        # print(f"正在解析: {url}")
        response = requests.get(url, headers=HEADERS)
        soup = BeautifulSoup(response.text, 'html.parser')

        # 简单判断是否为 2D 资产 (看面包屑或者标签)
        # 如果页面包含 "2D" 字样，或者我们在下载时自行筛选
        # 这里为了保险，只要能下载 zip 我们就下，回头你再人工挑

        # 2. 查找下载链接
        download_link = None

        # 策略A: 找直接的 .zip 链接
        for a in soup.find_all('a', href=True):
            if a['href'].endswith('.zip'):
                download_link = a['href']
                break

        # 策略B: 找 id="download" 的区域内的链接
        if not download_link:
            download_div = soup.find('div', id='download')
            if download_div:
                a_tag = download_div.find('a', href=True)
                if a_tag:
                    download_link = a_tag['href']

        if not download_link:
             # print(f"  [跳过] 未找到下载链接 (可能需要捐赠): {url}")
             return

        # 补全链接
        if not download_link.startswith('http'):
             download_link = f"https://kenney.nl{download_link}"

        # 3. 确定文件名
        file_name = download_link.split('/')[-1]

        # 过滤非 2D 资源 (通过文件名简单判断，或者全部下载)
        # Kenney 的文件名通常很规范，比如 'kenney_rpg-base.zip'
        # 我们这里全部下载，因为 3D/Audio 也是可以卖的

        save_path = os.path.join(DOWNLOAD_DIR, file_name)

        if os.path.exists(save_path):
            print(f"  [跳过] 文件已存在: {file_name}")
            return

        # 4. 下载文件
        print(f"  [下载中] {file_name} ...")
        with requests.get(download_link, headers=HEADERS, stream=True) as r:
            r.raise_for_status()
            with open(save_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)

        print(f"  [成功] 已保存到 {save_path}")
        time.sleep(0.5)

    except Exception as e:
        print(f"  [失败] 下载出错 {url}: {e}")

if __name__ == "__main__":
    print("=== Kenney.nl 全站素材自动爬虫启动 (修正版) ===")
    print(f"保存路径: {DOWNLOAD_DIR}")

    asset_links = get_asset_links()

    if not asset_links:
        print("未找到任何链接，尝试硬编码热门包...")
        # 如果爬取列表失败，我们直接下载几个最热门的包
        asset_links = [
            "https://kenney.nl/assets/rpg-base",
            "https://kenney.nl/assets/platformer-art-pixel-redux",
            "https://kenney.nl/assets/ui-pack",
            "https://kenney.nl/assets/ui-pack-rpg-expansion",
            "https://kenney.nl/assets/fantasy-ui-borders",
            "https://kenney.nl/assets/pixel-platformer",
            "https://kenney.nl/assets/tiny-dungeon",
            "https://kenney.nl/assets/tiny-town",
            "https://kenney.nl/assets/roguelike-caves-dungeon",
            "https://kenney.nl/assets/roguelike-modern-city"
        ]

    for i, link in enumerate(asset_links):
        print(f"[{i+1}/{len(asset_links)}] 正在处理: {link.split('/')[-1]}")
        download_asset(link)

    print("\n=== 全部任务完成 ===")
    print("请检查 downloaded_assets 文件夹。")
