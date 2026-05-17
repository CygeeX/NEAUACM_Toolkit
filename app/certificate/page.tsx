"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// 将届数数字转换为中文
function editionToChinese(n: number): string {
  const ones = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const tens = ["", "十", "二十", "三十"];
  if (n <= 0) return "";
  const t = Math.floor(n / 10);
  const o = n % 10;
  if (t === 0) return ones[o];
  if (o === 0) return tens[t];
  return tens[t] + ones[o];
}

// 将届数数字转换为英文序数词
function editionToEnglish(n: number): string {
  const suffixes: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };
  const suffix = suffixes[n % 100] || suffixes[n % 10] || "th";
  return `${n}${suffix}`;
}

// 月份英文缩写
const MONTH_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface FormData {
  date: string;        // YYYY-MM-DD
  dateCn: string;      // 2026年10月25日
  dateEn: string;      // Oct 25, 2026
  competition: string;     // 第十三届大学生程序设计竞赛
  competitionCn: string;   // 第十三届
  competitionEn: string;   // 13th
  name: string;
  engName: string;
  prize: string;
  isTemp: boolean;
  isPrint: boolean;
}

function calcFromDate(dateStr: string): Partial<FormData> {
  if (!dateStr) return {};
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const editionNum = year - 2013;
  const editionCn = editionToChinese(editionNum);
  const editionEn = editionToEnglish(editionNum);

  return {
    date: dateStr,
    dateCn: `${year}年${month}月${day}日`,
    dateEn: `${MONTH_EN[month - 1]} ${day}, ${year}`,
    competition: `第${editionCn}届大学生程序设计竞赛`,
    competitionCn: `第${editionCn}届`,
    competitionEn: editionEn,
  };
}

// ====== 公共证书绘制函数 ======
// 接收所有绘制参数，返回 dataURL。
// 单人生成和批量生成都复用此函数，不依赖组件闭包。
interface DrawParams {
  name: string;
  engName: string;
  prize: string;
  competition: string;
  competitionEn: string;
  dateCn: string;
  dateEn: string;
  isPrint: boolean;
}

function drawCertificateToDataURL(params: DrawParams): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // 根据 isPrint 选择底图：打印模式用空白模板，普通模式用彩色模板
    const templateSrc = params.isPrint ? "/certificate-emtpy.png" : "/certificate-template.png";
    img.src = templateSrc;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法获取 canvas 上下文"));
        return;
      }

      const w = canvas.width;
      const h = canvas.height;

      // 1. 画底图
      ctx.drawImage(img, 0, 0, w, h);

      // 2. 公共设置
      ctx.fillStyle = "#111111";
      ctx.textBaseline = "middle";

      // ====== 文案拼接 ======

      // 奖项中英文映射
      const prizeMap: Record<string, { cn: string; en: string }> = {
        gold: { cn: "金奖", en: "Gold Medal" },
        silver: { cn: "银奖", en: "Silver Medal" },
        bronze: { cn: "铜奖", en: "Bronze Medal" },
        first: { cn: "一等奖", en: "First Prize" },
        second: { cn: "二等奖", en: "Second Prize" },
        third: { cn: "三等奖", en: "Third Prize" },
      };

      const prizeKey = String(params.prize || "").trim().toLowerCase();
      const prizeText = prizeMap[prizeKey]
        ? `${prizeMap[prizeKey].cn}/${prizeMap[prizeKey].en}`
        : params.prize || "";

      // 姓名：中文/英文 同一行
      const fullName = `${params.name || ""}/${params.engName || ""}`;

      // 比赛说明：底部第一行
      const competitionLine = `东北农业大学${params.competition || ""}/The ${params.competitionEn || ""} NEAU Collegiate Programming Contest`;

      // 日期说明：底部第二行
      const dateLine = `东北农业大学 ${params.dateCn || ""}/Northeast Agricultural University ${params.dateEn || ""}`;

      // ====== 开始绘制 ======

      // A. 左上角：颁给 / Awarded to
     /*  ctx.textAlign = "left";
      ctx.font = `bold ${w * 0.022}px "Times New Roman", "SimSun", serif`;
      ctx.fillText("颁给/Awarded to", w * 0.12, h * 0.305); */

      // B. 中间：姓名（中英文同一行）
      ctx.textAlign = "center";
      ctx.font = `bold ${w * 0.040}px "STKaiti", "KaiTi", "SimKai", "楷体", serif`;;
      ctx.fillText(fullName, w * 0.50, h * 0.445);

      // C. 中间：奖项（中英文同一行）
      ctx.font = `normal ${w * 0.050}px "Microsoft YaHei", Arial, sans-serif`;
      ctx.fillText(prizeText, w * 0.50, h * 0.565);

      // D. 底部两行说明（左对齐）
     ctx.textAlign = "center";
      ctx.font = `${w * 0.019}px "Microsoft YaHei", Arial, sans-serif`;

      ctx.fillText(competitionLine, w * 0.5, h * 0.705);
      ctx.fillText(dateLine, w * 0.5, h * 0.755);

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = reject;
  });
}

// ====== 批量生成行数据类型 ======
interface BatchRow {
  name: string;   // 格式：曹原高歌/Cao Yuan Gao Ge
  prize: string;  // 格式：金奖/Gold Medal 或 gold 等
}

export default function CertificateEditorPage() {
  // ====== 单人生成 state（原有，不改动）======
  const [formData, setFormData] = useState<FormData>({
    date: "",
    dateCn: "",
    dateEn: "",
    competition: "",
    competitionCn: "",
    competitionEn: "",
    name: "",
    engName: "",
    prize: "gold",
    isTemp: false,
    isPrint: false,
  });

  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");

  // ====== 批量生成 state ======
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [batchFileName, setBatchFileName] = useState<string>("");
  const [batchGenerating, setBatchGenerating] = useState(false);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // 使用 Canvas API 将模板图片与文字合成为一张图片，返回 dataURL
  // 复用公共函数 drawCertificateToDataURL，传入当前 formData
  async function generateCertificate(): Promise<string> {
    return drawCertificateToDataURL({
      name: formData.name,
      engName: formData.engName,
      prize: formData.prize,
      competition: formData.competition,
      competitionEn: formData.competitionEn,
      dateCn: formData.dateCn,
      dateEn: formData.dateEn,
      isPrint: formData.isPrint,
    });
  }

  async function handlePreview() {
    if (!formData.date || !formData.name || !formData.engName) {
      toast.warning("请填写完整信息：比赛日期、姓名、英文名为必填项");
      return;
    }
    const dataURL = await generateCertificate();
    setPreviewImage(dataURL);
    setShowPreview(true);
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const dateStr = e.target.value;
    const computed = calcFromDate(dateStr);
    setFormData((prev) => ({ ...prev, ...computed }));
  }

  // ====== 批量生成：解析 Excel ======
  function handleBatchFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBatchFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      // 读取第一个 sheet，转为对象数组
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

      // 校验表头
      if (rows.length === 0 || !("姓名" in rows[0]) || !("奖项" in rows[0])) {
        toast.error('Excel 缺少"姓名"或"奖项"表头，请检查文件格式。');
        setBatchRows([]);
        setBatchFileName("");
        return;
      }

      const parsed: BatchRow[] = rows.map((r) => ({
        name: String(r["姓名"] ?? ""),
        prize: String(r["奖项"] ?? ""),
      }));
      setBatchRows(parsed);
    };
    reader.readAsArrayBuffer(file);
  }

  // ====== 批量生成：循环生成 PNG 并打包 ZIP ======
  async function handleBatchGenerate() {
    if (batchRows.length === 0) {
      toast.warning("请先上传 Excel 文件");
      return;
    }
    if (!formData.date) {
      toast.warning("请在单人生成区域填写比赛日期，批量生成会复用该日期信息");
      return;
    }
    setBatchGenerating(true);
    try {
      const zip = new JSZip();
      for (const row of batchRows) {
        // 姓名格式：曹原高歌/Cao Yuan Gao Ge，拆分中英文
        const [cnName = "", enName = ""] = row.name.split("/");
        // 复用公共绘制函数，isPrint 固定为 false（批量生成用彩色模板）
        const dataURL = await drawCertificateToDataURL({
          name: cnName.trim(),
          engName: enName.trim(),
          prize: row.prize,
          competition: formData.competition,
          competitionEn: formData.competitionEn,
          dateCn: formData.dateCn,
          dateEn: formData.dateEn,
          isPrint: true,
        });
        // dataURL 转 Blob 写入 zip
        const base64 = dataURL.split(",")[1];
        zip.file(`certificate-${row.name || "unknown"}.png`, base64, { base64: true });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `certificates-${formData.date || "batch"}.zip`);
    } catch (err) {
      toast.error("批量生成失败：" + String(err));
    } finally {
      setBatchGenerating(false);
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-14">

      {/* ====== 单人生成区域 ====== */}
      <section className="rounded-2xl border border-border bg-card shadow-md p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold">单人生成</h2>
          <p className="text-sm text-muted-foreground mt-1">
            适合临时修改某一张证书，填写信息后可以预览和下载。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[430px_1fr] gap-12">
          {/* 左：证书信息表单 */}
          <Card>
            <CardHeader>
              <CardTitle>证书信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                      比赛日期
                    </label>
                    <input
                      type="date"
                      id="date"
                      value={formData.date}
                      onChange={handleDateChange}
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-700">
                      赛别
                    </label>
                    <Input
                      readOnly
                      value={formData.competitionCn}
                      placeholder="eg:第十三届 "
                      className="mt-1 cursor-default"
                    />
                  </div>
                </div>

                {/* 姓名 + 英文名 */}
                <div className="flex gap-5">
                  <div className="w-1/2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      姓名
                    </label>
                    <Input
                      placeholder="姓名"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div className="w-1/2">
                    <label htmlFor="eng_name" className="block text-sm font-medium text-gray-700">
                      英文名
                    </label>
                    <Input
                      placeholder="Xing Ming"
                      id="eng_name"
                      value={formData.engName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, engName: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* 奖项 */}
                <div>
                  <label htmlFor="prize" className="block text-sm font-medium text-gray-700">
                    奖项
                  </label>
                  <Select
                    value={formData.prize}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, prize: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择奖项" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key="gold" value="gold">
                        金奖/Gold Medal
                      </SelectItem>
                      <SelectItem key="silver" value="silver">
                        银奖/Silver Medal
                      </SelectItem>
                      <SelectItem key="bronze" value="bronze">
                        铜奖/Bronze Medal
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 临时证书 + 打印模式 */}
                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <label className="text-sm">临时证书</label>
                  </div>
                  <Switch
                    checked={formData.isTemp}
                    onCheckedChange={(v) => setFormData((prev) => ({ ...prev, isTemp: v }))}
                  />
                  <div className="space-y-0.5">
                    <label className="text-sm">打印模式</label>
                  </div>
                  <Switch
                    checked={formData.isPrint}
                    onCheckedChange={(v) => {
                      setFormData((prev) => ({ ...prev, isPrint: v }));
                      setPreviewImage("");
                      setShowPreview(false);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 右：预览卡片 */}
          <Card>
            <CardContent className="h-full">
              <div className="flex flex-col justify-center items-center h-full w-full gap-4 py-6">
                <p className="text-sm text-muted-foreground">{formData.competition || "填写日期后自动生成赛别"}</p>
                <Button onClick={handlePreview}>预览</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ====== 批量生成区域 ====== */}
      <section className="rounded-2xl border border-border bg-card shadow-md p-6">
      <div className="mb-5">
      <div className="flex items-center gap-2">
      <h2 className="text-lg font-bold">批量生成</h2>
       <span className="text-sm text-muted-foreground">
      默认打印模式
         </span>
  </div>

  <p className="text-sm text-muted-foreground mt-1">
    上传 Excel，读取姓名和奖项，一次性生成多张证书并打包下载。
  </p>
</div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">
          {/* 左：上传 Excel */}
          <Card>
            <CardHeader>
              <CardTitle>上传 Excel 文件</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 隐藏的 file input */}
              <input
                ref={batchFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleBatchFileChange}
              />
              {/* 虚线上传区域，点击触发 input */}
              <div
                className="flex items-center justify-center h-40 rounded-xl border-2 border-dashed border-muted-foreground/40 bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => batchFileInputRef.current?.click()}
              >
                <span className="text-sm text-muted-foreground font-medium">
                  {batchFileName ? batchFileName : "点击上传或拖动文件到此处"}
                </span>
              </div>
              <div className="mt-3 teixt-xs text-muted-foreground space-y-1">
                <p>Excel 表头建议固定为：姓名、奖项。</p>
                <p>姓名格式：金迪/Jin Di</p>
                <p>奖项格式：金奖/Gold Medal。</p>
              </div>
            </CardContent>
          </Card>

          {/* 右：文件示例 / 解析预览 */}
          <Card>
            <CardHeader>
              <CardTitle>文件示例</CardTitle>
            </CardHeader>
            <CardContent>
              {batchRows.length === 0 ? (
                <>
                  <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20">
                    <span className="text-sm text-muted-foreground">这里展示 Excel 示例或解析预览</span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    上传后可以在这里显示已读取的数据数量，例如：已读取 48 条数据。
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium mb-2">已读取 {batchRows.length} 条数据</p>
                  {/* 前 5 条预览 */}
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">姓名</th>
                          <th className="px-3 py-2 text-left font-medium">奖项</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchRows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-1.5 truncate max-w-[120px]">{row.name}</td>
                            <td className="px-3 py-1.5">{row.prize}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {batchRows.length > 5 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      仅显示前 5 条，共 {batchRows.length} 条
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 批量生成按钮 */}
        <div className="flex justify-end mt-5">
          <Button
            variant="default"
            onClick={handleBatchGenerate}
            disabled={batchGenerating || batchRows.length === 0}
          >
            {batchGenerating ? "生成中..." : "批量生成并下载 ZIP"}
          </Button>
        </div>
      </section>

      {/* 证书预览弹窗（原有，不改动）*/}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="relative max-w-4xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 下载按钮：从 previewImage dataURL 创建 <a> 标签触发下载 */}
            <button
              className="absolute -top-8 right-16 text-white text-sm hover:underline"
              onClick={() => {
                const a = document.createElement("a");
                // 文件名：certificate-姓名-日期.png
                a.download = `certificate-${formData.name || "unknown"}-${formData.date || "unknown"}.png`;
                a.href = previewImage;
                a.click();
              }}
            >
              下载
            </button>
            <button
              className="absolute -top-8 right-0 text-white text-sm hover:underline"
              onClick={() => setShowPreview(false)}
            >
              关闭 ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="证书预览" className="w-full rounded shadow-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
