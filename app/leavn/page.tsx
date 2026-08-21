"use client";

import { useMemo } from "react";
import Papa from "papaparse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import ReactJson from "@microlink/react-json-view";

import { cn } from "@/lib/utils";
import { genDoc, genYearsList, organiseData, StudentInfo } from "@/lib/leaveNoteUtils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  trainingDates: z.array(z.date()).min(1, {
    message: "请至少选择一个培训日期",
  }),
  studentGrade: z.string({
    required_error: "请选择学生年级",
  }),
  leaveReason: z.string().min(2, {
    message: "请填写请假事由",
  }),
  conflictContent: z.string({
    required_error: "请选择冲突内容",
  }),
  signatureDate: z.date({
    required_error: "请选择签名日期",
  }),
  signature: z.string().min(2, {
    message: "请填写签名落款",
  }),
  alignName: z.boolean().default(false),
  jsonField: z.string().min(1, {
    message: "请输入 CSV 数据",
  }),
});

type LeaveFormValues = z.infer<typeof formSchema>;

const defaultValues: LeaveFormValues = {
  trainingDates: [],
  alignName: true,
  jsonField: "",
  leaveReason: "ACM集训队训练",
  conflictContent: "晚自习",
  studentGrade: genYearsList()[0].toString(),
  signatureDate: new Date(),
  signature: "电气与信息学院",
};

function parseStudentsFromCsv(csvText: string): StudentInfo[] {
  if (!csvText) {
    return [];
  }

  const { data } = Papa.parse<StudentInfo>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return data
    .map((student) => ({
      班级: String(student?.班级 ?? "").trim(),
      姓名: String(student?.姓名 ?? "").trim(),
      学号: String(student?.学号 ?? "").trim(),
      学院: String(student?.学院 ?? "").trim(),
      辅导员: String(student?.辅导员 ?? "").trim(),
    }))
    .filter((student) => Object.values(student).some((value) => value !== ""));
}

export default function LeaveFormPage() {
  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const jsonField = useWatch({
    control: form.control,
    name: "jsonField",
    defaultValue: defaultValues.jsonField,
  });

  const trainingDates = useWatch({
    control: form.control,
    name: "trainingDates",
    defaultValue: defaultValues.trainingDates,
  });

  const studentGrade = useWatch({
    control: form.control,
    name: "studentGrade",
    defaultValue: defaultValues.studentGrade,
  });

  const leaveReason = useWatch({
    control: form.control,
    name: "leaveReason",
    defaultValue: defaultValues.leaveReason,
  });

  const conflictContent = useWatch({
    control: form.control,
    name: "conflictContent",
    defaultValue: defaultValues.conflictContent,
  });

  const signatureDate = useWatch({
    control: form.control,
    name: "signatureDate",
    defaultValue: defaultValues.signatureDate,
  });

  const signature = useWatch({
    control: form.control,
    name: "signature",
    defaultValue: defaultValues.signature,
  });

  const alignName = useWatch({
    control: form.control,
    name: "alignName",
    defaultValue: defaultValues.alignName,
  });

  const formData = useMemo<LeaveFormValues>(
    () => ({
      jsonField,
      trainingDates: trainingDates ?? [],
      studentGrade,
      leaveReason,
      conflictContent,
      signatureDate,
      signature,
      alignName,
    }),
    [alignName, conflictContent, jsonField, leaveReason, signature, signatureDate, studentGrade, trainingDates]
  );

  const parsedStudents = useMemo(() => parseStudentsFromCsv(formData.jsonField.trim()), [formData.jsonField]);
  const parsedStudentsSummary = useMemo(() => organiseData(JSON.stringify(parsedStudents)), [parsedStudents]);

  async function onSubmit(values: LeaveFormValues) {
    const requiredHeaders = ["班级", "姓名", "学号", "学院", "辅导员"];
    const csvText = values.jsonField.trim();
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== "");

    if (lines.length === 0) {
      toast.error("CSV 数据为空，请填写后重试");
      return;
    }

    const headerCells = lines[0].split(",").map((cell) => cell.trim());
    const missingHeaders = requiredHeaders.filter((header) => !headerCells.includes(header));

    if (missingHeaders.length > 0) {
      toast.error(`CSV 表头缺少：${missingHeaders.join("、")}`);
      return;
    }

    for (let index = 1; index < lines.length; index++) {
      const columns = lines[index].split(",");

      if (columns.length < 5) {
        toast.error(`第 ${index + 1} 行数据列数不足，请检查 CSV 格式`);
        return;
      }
    }

    try {
      await genDoc({
        jsonStr: JSON.stringify(parseStudentsFromCsv(csvText)),
        year: parseInt(values.studentGrade, 10),
        trainDateList: values.trainingDates,
        signDate: values.signatureDate,
        reason: values.leaveReason,
        conflictWith: values.conflictContent,
        alignName: values.alignName,
      });
    } catch (error) {
      toast.error(`生成请假条失败：${String(error)}`);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-center flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="jsonField"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-bold">数据 CSV</FormLabel>
                    <div className="mb-2">
                      <p className="mb-1 text-sm font-medium text-muted-foreground">示例输入</p>
                      <pre className="text-xs text-gray-400 whitespace-pre-wrap bg-muted/40 rounded-md px-3 py-2 font-mono select-all">
{`班级,姓名,学号,学院,辅导员
计科2401,王明,A12345678,电气与信息学院,韩立军
计科2402,张涛,A19240331,电气与信息学院,韩立军`}
                      </pre>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="CSV 应包含如下字段：班级、姓名、学号、学院、辅导员（不限顺序）"
                        value={field.value ?? ""}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          field.onChange(nextValue);
                          form.setValue("jsonField", nextValue, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                        }}
                        rows={10}
                        className="min-h-[200px] font-mono text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trainingDates"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>培训日期</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !(field.value ?? []).length && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {(field.value ?? []).length ? (
                              (field.value ?? []).length > 3 ? (
                                <span>已选择 {(field.value ?? []).length} 个日期</span>
                              ) : (
                                (field.value ?? []).map((date) => format(date, "yyyy/MM/dd")).join(", ")
                              )
                            ) : (
                              <span>选择日期（可多选）</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="multiple"
                          selected={field.value ?? []}
                          onSelect={(nextDates) => {
                            const value = nextDates ?? [];
                            field.onChange(value);
                            form.setValue("trainingDates", value, {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            });
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                    {(field.value ?? []).length ? (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(field.value ?? []).map((date) => (
                          <Badge key={date.toISOString()} variant="secondary">
                            {format(date, "yyyy/MM/dd")}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="studentGrade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>学生年级</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("studentGrade", value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择年级" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {genYearsList().map((item) => (
                          <SelectItem key={item} value={item.toString()}>
                            {item}级
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leaveReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>请假事由</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入请假事由"
                        value={field.value ?? ""}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          field.onChange(nextValue);
                          form.setValue("leaveReason", nextValue, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="conflictContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>冲突内容</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("conflictContent", value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择冲突内容" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="晚自习">晚自习</SelectItem>
                        <SelectItem value="课程">课程</SelectItem>
                        <SelectItem value="其他活动">其他活动</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="signatureDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>签名日期</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "yyyy/MM/dd") : <span>选择日期</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(nextDate) => {
                            if (!nextDate) {
                              return;
                            }

                            field.onChange(nextDate);
                            form.setValue("signatureDate", nextDate, {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            });
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="signature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>签名落款</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入签名落款"
                        value={field.value ?? ""}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          field.onChange(nextValue);
                          form.setValue("signature", nextValue, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alignName"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">对齐姓名</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          form.setValue("alignName", checked, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                提交并生成
              </Button>

              <div className="flex justify-center">
                <Badge variant="secondary">若文件下载不成功或下载不全，请授予自动下载权限</Badge>
              </div>
            </form>
          </Form>
        </div>

        <div className="w-full lg:w-1/3">
          <Card>
            <CardHeader>
              <CardTitle>预览</CardTitle>
              <CardDescription>请确认信息准确</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold pb-2">数据解析</h3>
                  <ReactJson
                    src={parsedStudentsSummary}
                    collapsed={2}
                    enableClipboard={false}
                    name="CSV"
                    iconStyle="square"
                    displayDataTypes={false}
                  />
                </div>
                <div>
                  <h3 className="font-semibold">培训日期</h3>
                  <p>
                    {formData.trainingDates.length
                      ? formData.trainingDates.map((date) => format(date, "yyyy年MM月dd日")).join(", ")
                      : "未选择"}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">学生年级</h3>
                  <p>{formData.studentGrade ? `${formData.studentGrade}级` : "未选择"}</p>
                </div>
                <div>
                  <h3 className="font-semibold">事由</h3>
                  <p>
                    参加 <span className="bg-[#3358D4]/10">{formData.leaveReason}</span>，与{" "}
                    <span className="bg-[#3358D4]/10">{formData.conflictContent}</span> 冲突
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
