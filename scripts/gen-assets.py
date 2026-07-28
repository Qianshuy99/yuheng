#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""玉衡资产生成器 — 把 assets/ 里的源图处理成可内联的 data URI。

产出两个由构建导入的生成文件（不要手改）：
  src/gen/icons.js            16/32/64/128 四档方形 PNG 图标
  src/themes/xp/wallpaper.js  去品牌、裁好比例的 Bliss 壁纸 JPEG

用法：python scripts/gen-assets.py
依赖：Pillow
"""

from __future__ import annotations

import base64
import io
import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops
except ImportError:  # pragma: no cover
    sys.exit('需要 Pillow：pip install Pillow')

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
GEN_DIR = ROOT / 'src' / 'gen'

ICON_SIZES = (16, 32, 64, 128)

# background.jpg 右下角有微软品牌：白字 "Microsoft WINDOWS" 约 x 813–1443 / y 746–842，
# 四色旗约 x 1247–1486 / y 676–827。品牌只在下半带里，天空整幅都是干净的。
# 所以不整幅镜像（那样云会对称成 V 字、草会在正中长出一根尖，一眼假），
# 只把 y >= PATCH_TOP 的右半带换成左侧干净草地的镜像，天空保持原样不对称。
PATCH_TOP = 560
PATCH_SEAM_X = 762        # 右半带从这里开始被替换（品牌最左端 813 之前留出余量）
FEATHER_Y = 60            # 上边缘垂直羽化，避免出现一条横向硬边
FEATHER_X = 46            # 接缝处水平羽化
WALLPAPER_OUT = (1280, 800)
WALLPAPER_QUALITY = 72

HEADER = '// 由 scripts/gen-assets.py 生成，请勿手改。\n'


def data_uri(payload: bytes, mime: str) -> str:
    return f'data:{mime};base64,' + base64.b64encode(payload).decode('ascii')


def square_icon(source: Image.Image, size: int) -> bytes:
    """按最长边等比缩放后补透明边成正方形。

    logo 是 363×512 的竖构图，直接 resize 成 16×16 会被压扁，所以先缩再补白。
    """
    scaled = source.copy()
    scaled.thumbnail((size, size), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2))
    buffer = io.BytesIO()
    canvas.save(buffer, 'PNG', optimize=True)
    return buffer.getvalue()


def build_icons() -> dict[int, str]:
    source = Image.open(ASSETS / 'logo.png').convert('RGBA')
    return {size: data_uri(square_icon(source, size), 'image/png') for size in ICON_SIZES}


def _ramp(length: int, feather: int, size: tuple[int, int], vertical: bool) -> Image.Image:
    """一维线性渐变拉成整块蒙版：0 在边缘，255 在 feather 像素之后。"""
    values = [min(255, round(i * 255 / feather)) if feather else 255 for i in range(length)]
    strip = Image.new('L', (1, length) if vertical else (length, 1))
    strip.putdata(values)
    return strip.resize(size, Image.BILINEAR)


def build_wallpaper() -> str:
    source = Image.open(ASSETS / 'background.jpg').convert('RGB')
    width, height = source.size
    patch_w = width - PATCH_SEAM_X
    patch_h = height - PATCH_TOP

    # 用左侧同高度的草地镜像去盖右下角品牌区。取 [0, patch_w) 再水平翻转，
    # 翻转后最左列正好是原图 x=patch_w-1，紧邻接缝，所以接缝两侧色调天然连续。
    patch = source.crop((0, PATCH_TOP, patch_w, height)).transpose(Image.FLIP_LEFT_RIGHT)
    mask = ImageChops.multiply(
        _ramp(patch_w, FEATHER_X, (patch_w, patch_h), vertical=False),
        _ramp(patch_h, FEATHER_Y, (patch_w, patch_h), vertical=True),
    )
    result = source.copy()
    result.paste(patch, (PATCH_SEAM_X, PATCH_TOP), mask)

    result = result.resize(WALLPAPER_OUT, Image.LANCZOS)
    buffer = io.BytesIO()
    result.save(buffer, 'JPEG', quality=WALLPAPER_QUALITY, optimize=True, progressive=True)
    return data_uri(buffer.getvalue(), 'image/jpeg')


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf8', newline='\n')
    print(f'{path.relative_to(ROOT).as_posix()}  {len(text) / 1024:.1f} KB')


def main() -> None:
    icons = build_icons()
    lines = [HEADER, '\nexport const ICONS = Object.freeze({\n']
    for size in ICON_SIZES:
        lines.append(f"\t'{size}': '{icons[size]}',\n")
    lines.append('});\n')
    write(GEN_DIR / 'icons.js', ''.join(lines))

    wallpaper = build_wallpaper()
    write(
        ROOT / 'src' / 'themes' / 'xp' / 'wallpaper.js',
        HEADER
        + '// 源图 assets/background.jpg：取左侧干净区水平镜像补满，去掉右下角微软品牌。\n'
        + f"\nexport const BLISS = '{wallpaper}';\n",
    )


if __name__ == '__main__':
    main()
