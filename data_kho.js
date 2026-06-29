/* DATA DANH MỤC KHO HÀNG HUỆ LINH — chỉ dùng 5 mã kho: XU/VPT/VP1/NL3/KT */
const KHO_DEFAULT = [
  {
    "makho": "XU",
    "tenkho": "Kho Xưởng"
  },
  {
    "makho": "VPT",
    "tenkho": "Kho VP Trệt"
  },
  {
    "makho": "VP1",
    "tenkho": "Kho VP Lầu 1"
  },
  {
    "makho": "NL3",
    "tenkho": "Kho NL3"
  },
  {
    "makho": "KT",
    "tenkho": "Kho Kỹ Thuật"
  }
];
if (typeof window !== "undefined") { window.KHO_DEFAULT = KHO_DEFAULT; }
if (typeof module !== "undefined" && module.exports) { module.exports = { KHO_DEFAULT }; }
