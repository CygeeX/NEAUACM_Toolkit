/* eslint-disable @typescript-eslint/no-explicit-any */

import PizZipUtils from "pizzip/utils";
import PizZip from "pizzip";
import JSZip from "jszip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

export interface StudentInfo {
  班级: string;
  姓名: string;
  学院: string;
  学号: string;
  辅导员: string;
}

interface ClassInfoList {
  班级: string;
  info: StudentInfo[];
}

interface DocBuilderParam {
  college: string;
  year: number;
  classInfoList: ClassInfoList[];
  trainDateList: Date[];
  signDate: Date;
  reason: string;
  conflictWith: string;
  alignName: boolean;
}

interface GenDocParams {
  jsonStr: string;
  year: number;
  trainDateList: Date[];
  signDate: Date;
  reason: string;
  conflictWith: string;
  alignName: boolean;
}

type PreviewSummary = Record<
  string,
  {
    学生人数: number;
    班级分组: Record<string, string[]>;
  }
>;

const ILLEGAL_FILE_NAME_PATTERN = /[\\/:*?"<>|]/g;
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

export function genYearsList() {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];
}

export function sanitizeFileName(fileName: string) {
  const sanitized = fileName.replace(ILLEGAL_FILE_NAME_PATTERN, "_").trim();
  return sanitized || "未命名学院";
}

function normalizeStudents(students: StudentInfo[]) {
  return students
    .map((student) => ({
      班级: String(student?.班级 ?? "").trim(),
      姓名: String(student?.姓名 ?? "").trim(),
      学院: String(student?.学院 ?? "").trim(),
      学号: String(student?.学号 ?? "").trim(),
      辅导员: String(student?.辅导员 ?? "").trim(),
    }))
    .filter((student) => Object.values(student).some((value) => value !== ""));
}

function groupStudentsByCollege(students: StudentInfo[]) {
  return students.reduce<Record<string, StudentInfo[]>>((accumulator, student) => {
    const college = student.学院 || "未命名学院";

    if (!accumulator[college]) {
      accumulator[college] = [];
    }

    accumulator[college].push(student);
    return accumulator;
  }, {});
}

function formatStudentName(name: string, alignName: boolean) {
  if (alignName && /^[\u4e00-\u9fa5]{2}$/.test(name)) {
    return `${name[0]}　${name[1]}`;
  }

  return name;
}

function buildClassInfoList(students: StudentInfo[], alignName: boolean) {
  const classesByName = students.reduce<Record<string, StudentInfo[]>>((accumulator, student) => {
    const className = student.班级 || "未命名班级";

    if (!accumulator[className]) {
      accumulator[className] = [];
    }

    accumulator[className].push(student);
    return accumulator;
  }, {});

  return Object.keys(classesByName)
    .sort((left, right) => left.localeCompare(right, "zh-Hans-CN"))
    .map<ClassInfoList>((className) => ({
      班级: className,
      info: classesByName[className].map((student, index) => ({
        ...student,
        姓名: `${index === 0 ? "" : "\n\n"}${formatStudentName(student.姓名, alignName)}`,
      })),
    }));
}

function createPreviewSummary(students: StudentInfo[]): PreviewSummary {
  const groupedByCollege = groupStudentsByCollege(students);

  return Object.keys(groupedByCollege)
    .sort((left, right) => left.localeCompare(right, "zh-Hans-CN"))
    .reduce<PreviewSummary>((accumulator, college) => {
      const classInfoList = buildClassInfoList(groupedByCollege[college], false);

      accumulator[college] = {
        学生人数: groupedByCollege[college].length,
        班级分组: classInfoList.reduce<Record<string, string[]>>((classAccumulator, classInfo) => {
          classAccumulator[classInfo.班级] = classInfo.info.map((student) => `${student.姓名.trim()}（${student.学号}）`);
          return classAccumulator;
        }, {}),
      };

      return accumulator;
    }, {});
}

export function organiseData(jsonStr: string) {
  try {
    const students = normalizeStudents(JSON.parse(jsonStr) as StudentInfo[]);
    return createPreviewSummary(students);
  } catch {
    return {};
  }
}

function loadFile(url: string) {
  return new Promise<any>((resolve, reject) => {
    PizZipUtils.getBinaryContent(url, (error, content) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(content);
    });
  });
}

function renderDocBlob(
  templateContent: any,
  { college, year, classInfoList, trainDateList, signDate, reason, conflictWith }: DocBuilderParam
) {
  const zip = new PizZip(templateContent);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render({
    college,
    year,
    student_nums: classInfoList.reduce((sum, item) => sum + item.info.length, 0),
    train_date: trainDateList.map(formatDate).join("、"),
    leave_days: trainDateList.length,
    sign_date: formatDate(signDate),
    classes: classInfoList,
    conflict_with: conflictWith.trim(),
    reason: reason.trim(),
  });

  return doc.getZip().generate({
    type: "blob",
    mimeType: DOCX_MIME_TYPE,
  });
}

export async function buildDoc(params: DocBuilderParam) {
  const templateContent = await loadFile("/leave_note.docx");
  return renderDocBlob(templateContent, params);
}

export async function genDoc({
  jsonStr,
  year,
  trainDateList,
  signDate,
  reason,
  conflictWith,
  alignName,
}: GenDocParams) {
  const students = normalizeStudents(JSON.parse(jsonStr) as StudentInfo[]);

  if (students.length === 0) {
    return;
  }

  const studentsByCollege = groupStudentsByCollege(students);
  const colleges = Object.keys(studentsByCollege).sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
  const templateContent = await loadFile("/leave_note.docx");

  if (colleges.length === 1) {
    const college = colleges[0];
    const blob = renderDocBlob(templateContent, {
      college,
      year,
      classInfoList: buildClassInfoList(studentsByCollege[college], alignName),
      trainDateList,
      signDate,
      reason,
      conflictWith,
      alignName,
    });

    saveAs(blob, `假条-${sanitizeFileName(college)}.docx`);
    return;
  }

  const zip = new JSZip();

  for (const college of colleges) {
    const blob = renderDocBlob(templateContent, {
      college,
      year,
      classInfoList: buildClassInfoList(studentsByCollege[college], alignName),
      trainDateList,
      signDate,
      reason,
      conflictWith,
      alignName,
    });

    zip.file(`假条-${sanitizeFileName(college)}.docx`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, "假条-批量下载.zip");
}
