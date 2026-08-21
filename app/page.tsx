import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Code, FileOutput, SwitchCamera } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container mx-auto flex flex-col justify-center items-center h-4/5 lg:w-1/2">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">NEAUACM Toolkit</h1>
        <p className="text-xl text-muted-foreground">工具集合</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/leavn" passHref>
          <Card className="cursor-pointer ">
            <CardHeader className="px-5 py-5">
              <CardTitle className="flex items-center">
                <FileOutput className="mr-2" />
                假条生成
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/certificate" passHref>
          <Card>
            <CardHeader className="px-5 py-5">
              <CardTitle className="flex items-center">
                <Award className="mr-2" />
                证书生成
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/convert" passHref>
          <Card>
            <CardHeader className="px-5 py-5">
              <CardTitle className="flex items-center">
                <SwitchCamera className="mr-2" />
                数据转换
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="https://fusiondepot.cn/" passHref>
          <Card>
            <CardHeader className="px-4 py-5">
              <CardTitle className="flex items-center">
                <Code className="mr-2" />
                文件管理
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
