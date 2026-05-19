"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createPortal } from "react-dom";
// ====== 坐标常量配置区域 ======
// 后续调整文字位置时只需修改这里的常量
const CANVAS_CONFIG = {
  // ===== 字体大小（相对于整张 canvas 宽度）=====
  COMPETITION_FONT_SIZE: 0.024, // 赛事名称
  SEAT_FONT_SIZE: 0.027,        // 座位号
  MAJOR_FONT_SIZE: 0.027,       // 专业信息
  NAME_FONT_SIZE: 0.027,        // 姓名

  // ===== 6 个小格子的中心坐标（相对于整张 canvas）=====
  // 3 行 × 2 列，每行的左右两个格子都显示同一个学生的信息
  // 每个数组元素是 [左格子中心, 右格子中心]
  BOXES: [
    // 第 1 行：同学 1
    [
      { x: 0.28, y: 0.17 },
      { x: 0.72, y: 0.17 },
    ],
    // 第 2 行：同学 2
    [
      { x: 0.28, y: 0.50 },
      { x: 0.72, y: 0.50 },
    ],
    // 第 3 行：同学 3
    [
      { x: 0.28, y: 0.83 },
      { x: 0.72, y: 0.83 },
    ],
  ],

  // ===== 每个格子内部四行文字的纵向偏移（相对于格子中心 y）=====
  OFFSET_COMPETITION: -0.11, // 赛事名称
  OFFSET_SEAT: -0.02,        // 座位号
  OFFSET_MAJOR: 0.03,        // 专业信息
  OFFSET_NAME: 0.081,         // 姓名
};

// ====== 气球盒绘制函数 ======
function drawBalloonBoxToDataURL(
  competition: string,
  students: [StudentInfo, StudentInfo, StudentInfo]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = "/balloonbox-template.png";

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
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // 3. 遍历 3 个学生，每个学生绘制到对应行的左右两个格子
      students.forEach((student, rowIndex) => {
        const rowBoxes = CANVAS_CONFIG.BOXES[rowIndex];

        // 每行有两个格子（左、右），都显示同一个学生的信息
        rowBoxes.forEach((box) => {
          const centerX = w * box.x;
          const centerY = h * box.y;

          // 赛事名称（每个格子都绘制）
          ctx.font = `bold ${w * CANVAS_CONFIG.COMPETITION_FONT_SIZE}px "STKaiti", "KaiTi", "SimKai", "楷体", serif`;
          ctx.fillText(competition, centerX, centerY + h * CANVAS_CONFIG.OFFSET_COMPETITION);

          // 座位号（非空才绘制）
          if (student.seatNo.trim()) {
            ctx.font = `bold ${w * CANVAS_CONFIG.SEAT_FONT_SIZE}px "STZhongsong", "华文中宋", "SimSun", "宋体", serif`;
            ctx.fillText(student.seatNo, centerX, centerY + h * CANVAS_CONFIG.OFFSET_SEAT);
          }

          // 专业信息（非空才绘制）
          if (student.major.trim()) {
            ctx.font = `bold ${w * CANVAS_CONFIG.MAJOR_FONT_SIZE}px "STZhongsong", "华文中宋", "SimSun", "宋体", serif`;
            ctx.fillText(student.major, centerX, centerY + h * CANVAS_CONFIG.OFFSET_MAJOR);
          }

          // 姓名（非空才绘制）
          if (student.name.trim()) {
            ctx.font = `bold ${w * CANVAS_CONFIG.NAME_FONT_SIZE}px "STZhongsong", "华文中宋", "SimSun", "宋体", serif`;
            ctx.fillText(student.name, centerX, centerY + h * CANVAS_CONFIG.OFFSET_NAME);
          }
        });
      });

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => reject(new Error("模板图片加载失败"));
  });
}
// ====== 数据结构 ======
interface StudentInfo {
  name: string;
  major: string;
  seatNo: string;
}

interface FormData {
  competition: string;
  students: [StudentInfo, StudentInfo, StudentInfo];
}

interface BatchRow {
  seatNo: string;
  major: string;
  name: string;
}



export default function BalloonBoxPage() {
  // ====== 手动生成 state ======
  const [formData, setFormData] = useState<FormData>({
    competition: "",
    students: [
      { name: "", major: "", seatNo: "" },
      { name: "", major: "", seatNo: "" },
      { name: "", major: "", seatNo: "" },
    ],
  });

  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");

  // ====== 批量生成 state ======
  const [batchCompetition, setBatchCompetition] = useState<string>("");
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [batchFileName, setBatchFileName] = useState<string>("");
  const [batchGenerating, setBatchGenerating] = useState(false);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // ====== 手动生成：预览 ======
  async function handlePreview() {
    if (!formData.competition) {
      toast.warning("请填写赛事名称");
      return;
    }

    try {
      const dataURL = await drawBalloonBoxToDataURL(formData.competition, formData.students);
      setPreviewImage(dataURL);
      setShowPreview(true);
    } catch (err) {
      toast.error("生成预览失败：" + String(err));
    }
  }

  // ====== 批量生成：解析 Excel ======
  function isExcelFile(file: File): boolean {
    const validExtensions = [".xlsx", ".xls"];
    const fileName = file.name.toLowerCase();
    return validExtensions.some((ext) => fileName.endsWith(ext));
  }

  // 表头/单元格清洗：移除 BOM、零宽字符、全角空格、不间断空格、换行制表符等
  function normalizeHeader(s: unknown): string {
    return String(s ?? "")
      .replace(/[﻿​‌‍⁠]/g, "") // BOM + 零宽
      .replace(/　/g, "")                            // 全角空格
      .replace(/ /g, "")                            // 不间断空格
      .replace(/\s+/g, "")                               // 普通空白（含换行/制表/空格）
      .trim();
  }

  function handleFile(file: File) {
    if (!isExcelFile(file)) {
      toast.error("仅支持上传 Excel 文件（.xlsx 或 .xls）");
      return;
    }

    setBatchFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;

      try {
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];

        // 读取为二维数组，第一行是表头
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          defval: ""
        });

        if (rows.length === 0) {
          toast.error("Excel 文件为空，请检查文件内容");
          setBatchRows([]);
          setBatchFileName("");
          return;
        }

        // 第一行是表头，清洗后校验
        const rawHeaders = rows[0].map((h) => String(h ?? ""));
        const headers = rawHeaders.map(normalizeHeader);

        // 调试输出：方便确认实际读到的表头到底是什么
        console.log("[balloonbox] 原始表头:", rawHeaders);
        console.log("[balloonbox] 原始表头字符码:", rawHeaders.map((h) =>
          Array.from(h).map((c) => c.charCodeAt(0).toString(16)).join(" ")
        ));
        console.log("[balloonbox] 清洗后表头:", headers);

        const seatNoIndex = headers.indexOf("座位号");
        const majorIndex = headers.indexOf("专业班级");
        const nameIndex = headers.indexOf("姓名");

        if (seatNoIndex === -1 || majorIndex === -1 || nameIndex === -1) {
          toast.error(
            `Excel 缺少"座位号"、"专业班级"或"姓名"表头。实际读到的表头：${headers.join(" | ") || "(空)"}`
          );
          setBatchRows([]);
          setBatchFileName("");
          return;
        }

        // 从第二行开始读取数据
        const parsed: BatchRow[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] || [];
          const seatNo = String(row[seatNoIndex] ?? "").trim();
          const major = String(row[majorIndex] ?? "").trim();
          const name = String(row[nameIndex] ?? "").trim();

          // 过滤完全空白的行
          if (!seatNo && !major && !name) continue;

          parsed.push({ seatNo, major, name });
        }

        if (parsed.length === 0) {
          toast.error("Excel 中没有有效数据，请检查文件内容");
          setBatchRows([]);
          setBatchFileName("");
          return;
        }

        setBatchRows(parsed);
        toast.success(`已读取 ${parsed.length} 条数据`);
      } catch (err) {
        toast.error("Excel 解析失败：" + String(err));
        setBatchRows([]);
        setBatchFileName("");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleBatchFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    handleFile(file);
  }

  // ====== 批量生成：生成 ZIP ======
  async function handleBatchGenerate() {
    if (batchRows.length === 0) {
      toast.warning("请先上传 Excel 文件");
      return;
    }
    if (!batchCompetition) {
      toast.warning("请填写赛事名称");
      return;
    }

    setBatchGenerating(true);
    try {
      const zip = new JSZip();
      // 每 3 个同学生成一张气球盒图
      for (let i = 0; i < batchRows.length; i += 3) {
        const group: [StudentInfo, StudentInfo, StudentInfo] = [
          batchRows[i] || { name: "", major: "", seatNo: "" },
          batchRows[i + 1] || { name: "", major: "", seatNo: "" },
          batchRows[i + 2] || { name: "", major: "", seatNo: "" },
        ];

        const dataURL = await drawBalloonBoxToDataURL(batchCompetition, group);
        const base64 = dataURL.split(",")[1];
        zip.file(`balloonbox-${i / 3 + 1}.png`, base64, { base64: true });
      }

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `balloonbox-${batchCompetition || "batch"}.zip`);
      toast.success("批量生成成功");
    } catch (err) {
      toast.error("批量生成失败：" + String(err));
    } finally {
      setBatchGenerating(false);
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-14">
      {/* ====== 手动生成区域 ====== */}
      <section className="rounded-2xl border border-border bg-card shadow-md p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold">手动生成</h2>
          <p className="text-sm text-muted-foreground mt-1">
            输入一个赛事名称，填写 3 位同学的姓名、专业信息和座位号。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[500px_1fr] gap-8">
          {/* 左：表单 */}
          <Card>
            <CardHeader>
              <CardTitle>气球盒信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 赛事名称 */}
                <div>
                  <label htmlFor="competition" className="block text-sm font-medium text-gray-700">
                    赛事名称
                  </label>
                  <Input
                    placeholder="东北农业大学第十二届程序设计竞赛"
                    id="competition"
                    value={formData.competition}
                    onChange={(e) => setFormData((prev) => ({ ...prev, competition: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                {/* 同学信息 1 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">同学信息 1</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="姓名"
                      value={formData.students[0].name}
                      onChange={(e) => {
                        const newStudents = [...formData.students] as [StudentInfo, StudentInfo, StudentInfo];
                        newStudents[0] = { ...newStudents[0], name: e.target.value };
                        setFormData((prev) => ({ ...prev, students: newStudents }));
                      }}
                    />
                    <Input
                      placeholder="专业信息"
                      value={formData.students[0].major}
                      onChange={(e) => {
                        const newStudents = [...formData.students] as [StudentInfo, StudentInfo, StudentInfo];
                        newStudents[0] = { ...newStudents[0], major: e.target.value };
                        setFormData((prev) => ({ ...prev, students: newStudents }));
                      }}
                    />
                    <Input
                      placeholder="座位号"
                      value={formData.students[0].seatNo}
                      onChange={(e) => {
                        const newStudents = [...formData.students] as [StudentInfo, StudentInfo, StudentInfo];
                        newStudents[0] = { ...newStudents[0], seatNo: e.target.value };
                        setFormData((prev) => ({ ...prev, students: newStudents }));
                      }}
                    />
                  </div>
                </div>

                {/* 同学信息 2 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">同学信息 2</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="姓名"
                      value={formData.students[1].name}
                      onChange={(e) => {
                        const newStudents = [...formData.students] as [StudentInfo, StudentInfo, StudentInfo];
                        newStudents[1] = { ...newStudents[1], name: e.target.value };
                        setFormData((prev) => ({ ...prev, students: newStudents }));
                      }}
                    />
                    <Input
                      placeholder="专业信息"
                      value={formData.students[1].major}
                      onChange={(e) => {
                        const newStudents = [...formData.students] as [StudentInfo, StudentInfo, StudentInfo];
                        newStudents[1] = { ...newStudents[1], major: e.target.value };
                        setFormData((prev) => ({ ...prev, students: newStudents }));
                      }}
                    />
                    <Input
                      placeholder="座位号"
                      value={formData.students[1].seatNo}
                      onChange={(e) => {
                        const newStudents = [...formData.students] as [StudentInfo, StudentInfo, StudentInfo];
                        newStudents[1] = { ...newStudents[1], seatNo: e.target.value };
                        setFormData((prev) => ({ ...prev, students: newStudents }));
                      }}
                    />
                  </div>
                </div>

                {/* 同学信息 3 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">同学信息 3</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="姓名"
                      value={formData.students[2].name}
                      onChange={(e) => {
                        const newStudents = [...formData.students] as [StudentInfo, StudentInfo, StudentInfo];
                        newStudents[2] = { ...newStudents[2], name: e.target.value };
                        setFormData((prev) => ({ ...prev, students: newStudents }));
                      }}
                    />
                    <Input
                      placeholder="专业信息"
                      value={formData.students[2].major}
                      onChange={(e) => {
                        const newStudents = [...formData.students] as [StudentInfo, StudentInfo, StudentInfo];
                        newStudents[2] = { ...newStudents[2], major: e.target.value };
                        setFormData((prev) => ({ ...prev, students: newStudents }));
                      }}
                    />
                    <Input
                      placeholder="座位号"
                      value={formData.students[2].seatNo}
                      onChange={(e) => {
                        const newStudents = [...formData.students] as [StudentInfo, StudentInfo, StudentInfo];
                        newStudents[2] = { ...newStudents[2], seatNo: e.target.value };
                        setFormData((prev) => ({ ...prev, students: newStudents }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 右：预览 */}
          <Card>
            <CardContent className="h-full">
              <div className="flex flex-col justify-center items-center h-full w-full gap-4 py-6">
                <p className="text-sm text-muted-foreground">填写信息后点击预览</p>
                <Button onClick={handlePreview}>预览</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ====== 批量生成区域 ====== */}
      <section className="rounded-2xl border border-border bg-card shadow-md p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold">批量生成</h2>
          <p className="text-sm text-muted-foreground mt-1">
            上传 Excel 后逐条读取座位号、专业班级和姓名，每 3 条数据生成一张气球盒图并打包下载。
          </p>
        </div>

        {/* 赛事名称 */}
        <div className="mb-4">
          <label htmlFor="batch-competition" className="block text-sm font-medium text-gray-700 mb-2">
            赛事名称
          </label>
          <Input
            placeholder="2024年十一欢乐赛"
            id="batch-competition"
            value={batchCompetition}
            onChange={(e) => setBatchCompetition(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左：上传 Excel */}
          <Card>
            <CardHeader>
              <CardTitle>上传 Excel 文件</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={batchFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleBatchFileChange}
              />
              <div
                className="flex items-center justify-center h-40 rounded-xl border-2 border-dashed border-muted-foreground/40 bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => batchFileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <span className="text-sm text-muted-foreground font-medium">
                  {batchFileName ? batchFileName : "点击上传或拖动文件到此处"}
                </span>
              </div>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>Excel 表头固定为：座位号、专业班级、姓名</p>
                <p>示例：A67 | 经济2507 | 张志豪</p>
              </div>
            </CardContent>
          </Card>

          {/* 右：数据预览 */}
          <Card>
            <CardHeader>
              <CardTitle>数据预览</CardTitle>
            </CardHeader>
            <CardContent>
              {batchRows.length === 0 ? (
                <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20">
                  <span className="text-sm text-muted-foreground">上传后显示数据预览</span>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium mb-2">已读取 {batchRows.length} 条数据</p>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">序号</th>
                          <th className="px-3 py-2 text-left font-medium">座位号</th>
                          <th className="px-3 py-2 text-left font-medium">专业信息</th>
                          <th className="px-3 py-2 text-left font-medium">姓名</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchRows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-1.5">{i + 1}</td>
                            <td className="px-3 py-1.5">{row.seatNo}</td>
                            <td className="px-3 py-1.5 truncate max-w-[100px]">{row.major}</td>
                            <td className="px-3 py-1.5">{row.name}</td>
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

      {/* 预览弹窗 */}
{showPreview &&
  createPortal(
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60"
          onClick={() => setShowPreview(false)}
        >
          <div className="relative max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute -top-8 right-16 text-white text-sm hover:underline"
              onClick={() => {
                const a = document.createElement("a");
                a.download = `balloonbox-${formData.competition || "preview"}.png`;
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
            <img src={previewImage} alt="气球盒预览" className="w-full rounded shadow-lg" />
          </div>
        </div>,
    document.body
      )}
    </div>
  );
}
