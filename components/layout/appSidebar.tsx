import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Award, CheckSquare, FileOutput, Globe, Home, LayoutDashboard, SwitchCamera, Box } from "lucide-react";
import Link from "next/link";

export function AppSidebar() {
  const toolItems = [
    { name: "假条生成", href: "/leavn", icon: FileOutput },
    { name: "证书生成", href: "/certificate", icon: Award },
    { name: "气球盒生成", href: "/balloonbox", icon: Box },
    { name: "数据转换", href: "/convert", icon: SwitchCamera },
  ];
  const linkItems = [
    { name: "管理系统", href: "https://www.neauacm.cn/", icon: LayoutDashboard },
    { name: "集训队官网", href: "https://home.neauacm.cn/", icon: Globe },
    { name: "Online Judge", href: "https://oj.neauacm.cn/", icon: CheckSquare },
  ];
  return (
    <Sidebar>
      <SidebarHeader>
        <h1 className="px-2">NEAUACM Toolkit</h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>功能</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem key="home">
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <Home />
                    <span>首页</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
          <SidebarGroupLabel>工具</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolItems.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
          <SidebarGroupLabel>链接</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {linkItems.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex p-2 justify-center flex-col gap-1">
              <Link target="_blank" className="text-xs text-gray-400" href="https://beian.miit.gov.cn/">
                黑ICP备2023004156号
              </Link>
              <Link target="_blank" className="text-xs text-gray-400" href="https://github.com/NeterAlex/">
                Made by 林歆 @NEAUACM
              </Link>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
