"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner"; // 引入新的提示组件

// 引入 UI 组件
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// 定义资源类型
interface Resource {
  id: number;
  title: string;
  category: string;
  quark_link: string;
  created_at: string;
  cover_url: string;
}

export default function AdminPage() {
  // --- 状态管理 ---
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);

  // 表单状态
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Cosplay"); // 默认分类
  const [quarkLink, setQuarkLink] = useState("");

  const SECRET_CODE = "123456"; // 🔴 记得改成你自己的密码

  // --- 核心逻辑 1: 登录 ---
  const handleLogin = () => {
    if (password === SECRET_CODE) {
      setIsLoggedIn(true);
      fetchResources(); // 登录成功后拉取列表
    } else {
      toast.error("密码错误！");
    }
  };

  // --- 核心逻辑 2: 拉取列表 ---
  const fetchResources = async () => {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .order("id", { ascending: false });
    if (data) setResources(data);
    if (error) toast.error("列表加载失败");
  };

  // --- 核心逻辑 3: 上传发布 (重头戏) ---
  const handleUpload = async () => {
    if (!file || !title || !quarkLink) {
      toast.warning("请填写完整信息并选择图片");
      return;
    }

    setLoading(true);
    try {
      // 1. (已删除压缩步骤，直接使用原 file)
      // toast.info("正在压缩图片..."); // 这句也不需要了

      // 2. 上传图片到 Storage
      toast.info("正在上传...");
      const fileName = `${Date.now()}-${file.name}`; // 生成唯一文件名

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("covers")
        .upload(fileName, file); // 👈 注意这里：直接传 file，不再是 compressedFile

      if (uploadError) throw uploadError;

      // 3. 获取图片公开链接
      const { data: { publicUrl } } = supabase.storage
        .from("covers")
        .getPublicUrl(fileName);

      // 4. 写入数据库
      const { error: dbError } = await supabase.from("resources").insert({
        title,
        category,
        quark_link: quarkLink,
        cover_url: publicUrl,
      });

      if (dbError) throw dbError;

      toast.success("发布成功！");

      // 5. 重置表单
      setTitle("");
      setQuarkLink("");
      setFile(null);
      // hack: 重置 input file 的显示
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      fetchResources();

    } catch (error: any) {
      console.error(error);
      toast.error("上传失败: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 核心逻辑 4: 删除 ---
  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这条资源吗？")) return;

    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) {
      toast.error("删除失败");
    } else {
      toast.success("已删除");
      fetchResources(); // 刷新列表
    }
  };

  // --- 渲染界面: 登录墙 ---
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-[350px]">
          <CardHeader><CardTitle>管理员登录</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="输入密钥"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button className="w-full" onClick={handleLogin}>进入后台</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- 渲染界面: 后台主页 ---
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">资源管理后台</h1>
        <Button variant="outline" onClick={() => setIsLoggedIn(false)}>退出</Button>
      </div>

      <div className="grid gap-8">
        {/* 上传区域 */}
        <Card>
          <CardHeader><CardTitle>📤 上传新资源</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>资源标题</Label>
                <Input
                  placeholder="例如：2024 Cosplay精选包"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>分类</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Cosplay">Cosplay</option>
                  <option value="ASMR">ASMR/音声</option>
                  <option value="Wallpaper">壁纸/图集</option>
                  <option value="Game">游戏资源</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>夸克网盘链接</Label>
                <Input
                  placeholder="https://pan.quark.cn/s/..."
                  value={quarkLink}
                  onChange={(e) => setQuarkLink(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>封面图片</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <Button
              className="w-full mt-4"
              onClick={handleUpload}
              disabled={loading}
            >
              {loading ? "正在处理..." : "确认发布"}
            </Button>
          </CardContent>
        </Card>

        {/* 列表区域 */}
        <Card>
          <CardHeader><CardTitle>📋 已发布资源 ({resources.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>封面</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell>
                      <img
                        src={res.cover_url}
                        className="w-10 h-10 object-cover rounded"
                        alt="封面"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{res.title}</TableCell>
                    <TableCell>{res.category}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(res.id)}
                      >
                        删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {resources.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      暂无数据，快去上传吧！
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
