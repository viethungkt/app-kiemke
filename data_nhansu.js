/* DATA NHÂN SỰ HUÊ LINH */
// Tổng số: 51 nhân sự
const NHAN_SU_DEFAULT = [
  {
    "manv": "T0008",
    "hoten": "HÀ VĂN TIẾN",
    "phongban": "Tổ Bảo trì",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "D0012",
    "hoten": "NGUYỄN HẢI ĐĂNG",
    "phongban": "Tổ Bảo trì",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "N0037",
    "hoten": "BÙI ĐÌNH NGHỊ",
    "phongban": "Tổ Bảo trì",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "M0007",
    "hoten": "NGUYỄN XUÂN MAY",
    "phongban": "Tổ Bảo trì",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "K0016",
    "hoten": "NGUYỄN QUỐC KHANG",
    "phongban": "Tổ Bảo trì",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "H0056",
    "hoten": "TRẦN THANH HOÀNG",
    "phongban": "Tổ Bảo trì",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "T0001",
    "hoten": "PHAN CAO TRƯỜNG",
    "phongban": "Tổ Bảo trì",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "T0080",
    "hoten": "NGUYỄN MINH TIẾN",
    "phongban": "Tổ Bảo trì",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "T0086",
    "hoten": "TRƯƠNG HOÀI THANH",
    "phongban": "Tổ Bảo trì",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "L0087",
    "hoten": "PHAN PHONG LƯU",
    "phongban": "Tổ Bảo trì",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "N0017",
    "hoten": "HÀ HẾNH NHỘC",
    "phongban": "BP kho",
    "chucvu": "Tài xế xe nâng",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "H0082",
    "hoten": "NGUYỄN THÁI HÒA",
    "phongban": "BP kho",
    "chucvu": "Thủ kho Thành phẩm và Bán thành phẩm",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "P0003",
    "hoten": "VÕ HỒNG PHÚC",
    "phongban": "Tổ Cấp màu",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "T0022",
    "hoten": "LÊ THỊ THIỆN",
    "phongban": "Tổ Cấp màu",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "N0063",
    "hoten": "PHẠM THỊ NHÂM",
    "phongban": "BP nhân sự",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "H0074",
    "hoten": "NGUYỄN THỊ PHƯƠNG HIỀN",
    "phongban": "BP nhân sự",
    "chucvu": "Giám Đốc Nhân Sự",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "T0004",
    "hoten": "NGÔ NGỌC THỊNH",
    "phongban": "Kế toán",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "H0089",
    "hoten": "BÙI VIỆT HÙNG",
    "phongban": "Kế toán",
    "chucvu": "Kế toán tổng hợp quản trị nhà máy",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "N0068",
    "hoten": "TRẦN THỊ TUYẾT NGA",
    "phongban": "BP vật tư",
    "chucvu": "Kiêm thủ kho vật tư",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "T0083",
    "hoten": "NGUYỄN VĂN THƯ",
    "phongban": "BP vật tư",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "T0010",
    "hoten": "PHẠM MINH TÂN",
    "phongban": "Tổ Máy cán",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "K0014",
    "hoten": "TRẦN MINH KÉP",
    "phongban": "Tổ Máy cán",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "D0019",
    "hoten": "PHẠM MỘNG ĐƯNG",
    "phongban": "Tổ Máy cán",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "N0020",
    "hoten": "PHAN THÀNH NHÂN",
    "phongban": "Tổ Máy cán",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "C0023",
    "hoten": "NGUYỄN VĂN CUNG",
    "phongban": "Tổ Máy cán",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "T0041",
    "hoten": "NGUYỄN MINH TÀI",
    "phongban": "Tổ Máy cán",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "D0045",
    "hoten": "PHẠM HOÀNG DINH",
    "phongban": "Tổ Máy cán",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "L0059",
    "hoten": "THẠCH KIÊN LONG",
    "phongban": "Tổ Máy cán",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "T0006",
    "hoten": "NGUYỄN PHƯỚC TRÌNH",
    "phongban": "Tổ Máy cán",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "T0024",
    "hoten": "NGUYỄN BẢO TUẤN",
    "phongban": "Tổ Máy cán",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "T0030",
    "hoten": "TRƯƠNG HỮU TẤN",
    "phongban": "Tổ Máy ghép",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "M0043",
    "hoten": "HÀ NGỌC MINH",
    "phongban": "Tổ Máy ghép",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "T0011",
    "hoten": "NÔNG VĂN THU",
    "phongban": "Tổ Máy in",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "T0018",
    "hoten": "NGUYỄN VĂN THỦ",
    "phongban": "Tổ Máy in",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "H0028",
    "hoten": "TRẦN ĐỨC HIỆP",
    "phongban": "Tổ Máy in",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "T0047",
    "hoten": "ĐẶNG THỊ PHƯƠNG THẢO",
    "phongban": "P. Kỹ thuật",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "P0064",
    "hoten": "ĐẶNG QUANG PHÔNG",
    "phongban": "Trưởng phòng  Kỹ thuật",
    "chucvu": "Trường phòng Kỹ Thuật",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "D0090",
    "hoten": "NGUYỄN HỮU KHẢI DUY",
    "phongban": "NV kế hoạch",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "A0051",
    "hoten": "ĐOÀN THẾ ANH",
    "phongban": "NV kế hoạch",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "D0038",
    "hoten": "LƯU TRẦN THÚY DIỄM",
    "phongban": "P. Sản xuất",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "M0042",
    "hoten": "ĐẶNG THẾ MINH",
    "phongban": "P. Sản xuất",
    "chucvu": "Trường phòng sản xuất",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "H0065",
    "hoten": "ĐẶNG ĐỨC HIỀN",
    "phongban": "NV kế hoạch",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "T0013",
    "hoten": "PHẠM THỊ THỦY TIÊN",
    "phongban": "Tạp vụ",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "C0027",
    "hoten": "LÊ THỊ KIM CƯƠNG",
    "phongban": "Tạp vụ",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "L0033",
    "hoten": "HỨA CHI LĂNG",
    "phongban": "Tổ Dệt",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "B0034",
    "hoten": "TRẦN QUỐC BẢO",
    "phongban": "Tổ Dệt",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "H0036",
    "hoten": "ĐẶNG DIỆU HIỀN",
    "phongban": "Tổ Dệt",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "P0044",
    "hoten": "TRỊNH NGỌC PHÚC",
    "phongban": "Tổ Dệt",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "Q0048",
    "hoten": "VÕ NGỌC QUỐC",
    "phongban": "Tổ Dệt",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "N0073",
    "hoten": "TRẦN THỊ NGUYÊN",
    "phongban": "Tổ Dệt",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  },
  {
    "manv": "H0084",
    "hoten": "NGUYỄN TRẦN MINH HẬU",
    "phongban": "Xây dựng",
    "chucvu": "nhân viên",
    "vaitro": "nhân viên kiểm đếm"
  }
];
if (typeof window !== "undefined") { window.NHAN_SU_DEFAULT = NHAN_SU_DEFAULT; }
if (typeof module !== "undefined" && module.exports) { module.exports = { NHAN_SU_DEFAULT }; }
