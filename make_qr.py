# -*- coding: utf-8 -*-
"""Gera o QR Code do link publicado. Uso:
   python make_qr.py https://SEU-PROJETO.web.app"""
import sys, qrcode
from qrcode.constants import ERROR_CORRECT_M

url = sys.argv[1] if len(sys.argv) > 1 else "https://painel-3em.web.app"
qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_M, box_size=12, border=3)
qr.add_data(url)
qr.make(fit=True)
img = qr.make_image(fill_color="#0a0e16", back_color="white")
out = "public/qr.png"
img.save(out)
print("QR salvo em", out, "->", url)
