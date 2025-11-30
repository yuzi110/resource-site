"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner";

// UI 组件
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

// 资源类型定义
interface Resource {
  id: number;
  title: string;
  category: string;
  quark_link: string;
  baidu_link?: string;
  xunlei_link?: string; // 确保数据库里有这个字段
  created_at: string;
  cover_url: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);

  // 表单状态
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Cosplay");

  // 链接状态
  const [quarkLink, setQuarkLink] = useState("");
  const [baiduLink, setBaiduLink] = useState("");
  const [xunleiLink, setXunleiLink] = useState("");

  const SECRET_CODE = "123456"; // 🔴 记得改成你的密码

  const handleLogin = () => {
    if (password === SECRET_CODE) {
      setIsLoggedIn(true);
      fetchResources();
    } else {
      toast.error("密码错误！");
    }
  };

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .order("id", { ascending: false });
    if (data) setResources(data);
  };

  const handleUpload = async () => {
    if (!file || !title || !quarkLink) {
      toast.warning("标题、图片和夸克链接是必填的！");
      return;
    }

    setLoading(true);
    try {
      toast.info("正在上传图片...");
      const fileName = `${Date.now()}-${file.name}`;

      // 1. 上传图片
      const { error: uploadError } = await supabase.storage
        .from("covers")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. 获取链接
      const { data: { publicUrl } } = supabase.storage
        .from("covers")
        .getPublicUrl(fileName);

      // 3. 写入数据库
      const { error: dbError } = await supabase.from("resources").insert({
        title,
        category,
        cover_url: publicUrl,
        quark_link: quarkLink,
        baidu_link: baiduLink || null,   // 空字符串转为 null
        xunlei_link: xunleiLink || null, // 空字符串转为 null
      });

      if (dbError) throw dbError;

      toast.success("发布成功！");

      // 重置表单
      setTitle("");
      setQuarkLink("");
      setBaiduLink("");
      setXunleiLink("");
      setFile(null);
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

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除？")) return;
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (!error) {
      toast.success("已删除");
      fetchResources();
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-[350px]">
          <CardHeader><CardTitle>管理员登录</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button className="w-full" onClick={handleLogin}>登录</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">资源管理后台</h1>
        <Button variant="outline" onClick={() => setIsLoggedIn(false)}>退出</Button>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader><CardTitle>📤 上传新资源</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* 基本信息 */}
              <div className="space-y-2">
                <Label>资源标题 (必填)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：2024 Cosplay精选" />
              </div>

              <div className="space-y-2">
                <Label>分类</Label>
                <select className="flex h-10 w-full rounded-md border border-input px-3" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="Cosplay">Cosplay</option>
                  <option value="ASMR">ASMR/音声</option>
                  <option value="Wallpaper">壁纸/图集</option>
                  <option value="Game">游戏资源</option>
                </select>
              </div>

              {/* 网盘链接区 - 三驾马车 */}
              <div className="col-span-1 md:col-span-2 grid grid-cols-1 gap-4 bg-gray-50 p-4 rounded-lg border">
                <div className="space-y-2">
                  <Label className="text-blue-600 font-bold flex items-center gap-2">
                    <img src="https://img.icons8.com/color/48/cloud-folder.png" className="w-5 h-5"/>
                    夸克网盘 (必填)
                  </Label>
                  <Input value={quarkLink} onChange={(e) => setQuarkLink(e.target.value)} placeholder="https://pan.quark.cn/..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <img src="https://img.icons8.com/color/48/baidu.png" className="w-5 h-5"/>
                      百度网盘 (选填)
                    </Label>
                    <Input value={baiduLink} onChange={(e) => setBaiduLink(e.target.value)} placeholder="https://pan.baidu.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <img src="https://img.icons8.com/fluency/48/thunderbird.png" className="w-5 h-5"/>
                      迅雷云盘 (选填)
                    </Label>
                    <Input value={xunleiLink} onChange={(e) => setXunleiLink(e.target.value)} placeholder="https://pan.xunlei.com/..." />
                  </div>
                </div>
              </div>

              {/* 图片上传 */}
              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label>封面图片 (支持长图)</Label>
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <Button className="w-full mt-4" onClick={handleUpload} disabled={loading}>
              {loading ? "正在处理..." : "确认发布"}
            </Button>
          </CardContent>
        </Card>

        {/* 资源列表 */}
        <Card>
          <CardHeader><CardTitle>📋 已发布资源</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>封面</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>链接情况</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell><img src={res.cover_url} className="w-10 h-10 object-cover rounded" /></TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{res.title}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {res.quark_link && <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">夸</span>}
                        {res.baidu_link && <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded border border-red-200">百</span>}
                        {res.xunlei_link && <span className="text-xs bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded border border-sky-200">迅</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(res.id)}>删除</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
