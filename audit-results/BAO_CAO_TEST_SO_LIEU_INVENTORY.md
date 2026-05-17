# Bao Cao Test So Lieu Inventory

Thoi gian chay: 2026-05-17 10:32 ICT

Pham vi: Stock Transfer tren local UI `http://127.0.0.1:5173/app/inventory`, ket noi Supabase that.

## Ket qua

Ket qua: PASS, khong co finding.

Kich ban test:

- San pham: Smart Plug
- Warehouse: North Warehouse
- Source bin: N-03
- Destination bin: N-01
- Quantity: 1

So lieu truoc khi nhan Save Transfer:

| Chi so | Gia tri |
|---|---:|
| Source bin quantity | 120 |
| Source bin available | 120 |
| Destination bin quantity | 0 |
| Destination bin available | 0 |
| Stock level total_quantity | 120 |
| Stock level available | 120 |
| Stock transfer count | 3 |

So lieu ngay sau khi nhan Save Transfer:

| Chi so | Gia tri |
|---|---:|
| Source bin quantity | 119 |
| Source bin available | 119 |
| Destination bin quantity | 1 |
| Destination bin available | 1 |
| Stock level total_quantity | 120 |
| Stock level available | 120 |
| Stock transfer count | 4 |

Doi chieu nghiep vu:

- Source bin giam dung 1.
- Destination bin tang dung 1.
- Vi chuyen trong cung warehouse, `stock_levels.total_quantity` va `stock_levels.available` giu nguyen dung.
- Man hinh Stock Transfers hien thi san pham, source bin, destination bin sau khi luu.
- Khong co page error hoac console error.

Sau test, script da tao transfer nguoc de hoan lai ton kho:

| Chi so | Gia tri |
|---|---:|
| Source bin quantity | 120 |
| Source bin available | 120 |
| Destination bin quantity | 0 |
| Destination bin available | 0 |
| Stock level total_quantity | 120 |
| Stock level available | 120 |

File JSON chi tiet: `audit-results/ui-inventory-data-audit.json`
