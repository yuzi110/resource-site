"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner";
import { Trash2, CheckCircle, MessageSquare, FileText, FolderOpen, Edit, X, LayoutTemplate, Megaphone, Link as LinkIcon, Settings, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false }) as any;

// UI 组件
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// --- 类型定义 ---
interface Category {
  id: number;
  name: string;
}

interface Resource {
  id: number;
  title: string;
  category: string;
  quark_link: string;
  baidu_link?: string;
  xunlei_link?: string;
  cover_url: string;
}

interface Article {
  id: number;
  title: string;
  cover_url: string;
  content: string;
  created_at: string;
}

interface PendingComment {
  id: number;
  nickname: string;
  content: string;
  created_at: string;
  article_id: number;
}

interface Banner {
  id: number;
  image_url: string;
  title: string;
  type: 'link' | 'dialog' | 'resource';
  link_url?: string;
  dialog_content?: string;
  resource_id?: number;
  created_at: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("resources");

  // 数据列表
  const [resources, setResources] = useState<Resource[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [pendingComments, setPendingComments] = useState<PendingComment[]>([]);

  // 分类状态
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  // 资源表单
  const [resFile, setResFile] = useState<File | null>(null);
  const [resTitle, setResTitle] = useState("");
  const [resCategory, setResCategory] = useState("");
  const [quarkLink, setQuarkLink] = useState("");
  const [baiduLink, setBaiduLink] = useState("");
  const [xunleiLink, setXunleiLink] = useState("");
  const [editingResourceId, setEditingResourceId] = useState<number | null>(null);
  const resourceFormRef = useRef<HTMLDivElement>(null);

  // 文章表单
  const [articleTitle, setArticleTitle] = useState("");
  const [articleContent, setArticleContent] = useState("");
  const [articleFile, setArticleFile] = useState<File | null>(null);
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);
  const articleFormRef = useRef<HTMLDivElement>(null);
  const [isVisualMode, setIsVisualMode] = useState(true);

  // 轮播图表单
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerType, setBannerType] = useState<'link' | 'dialog' | 'resource'>('link');
  const [bannerLinkUrl, setBannerLinkUrl] = useState("");
  const [bannerDialogContent, setBannerDialogContent] = useState(""); // 现在这里存 HTML
  const [bannerResourceId, setBannerResourceId] = useState<string>("");
  const [editingBannerId, setEditingBannerId] = useState<number | null>(null);
  const bannerFormRef = useRef<HTMLDivElement>(null);

  const quillRef = useRef<any>(null);
  const hiddenFileInput = useRef<HTMLInputElement>(null);
  const SECRET_CODE = "123456";

  const handleLogin = () => {
    if (password === SECRET_CODE) {
      setIsLoggedIn(true);
      fetchInitialData();
    } else {
      toast.error("密码错误！");
    }
  };

  const fetchInitialData = () => {
    fetchResources(); fetchArticles(); fetchPendingComments(); fetchBanners(); fetchCategories();
  };

  // 获取数据函数
  const fetchResources = async () => { const { data } = await supabase.from("resources").select("*").order("id", { ascending: false }); if (data) setResources(data); };
  const fetchArticles = async () => { const { data } = await supabase.from("articles").select("*").order("created_at", { ascending: false }); if (data) setArticles(data); };
  const fetchPendingComments = async () => { const { data } = await supabase.from("comments").select("*").eq("is_approved", false).order("created_at", { ascending: false }); if (data) setPendingComments(data); };
  const fetchBanners = async () => { const { data } = await supabase.from("banners").select("*").order("created_at", { ascending: false }); if (data) setBanners(data as any); };
  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("id", { ascending: true });
    if (data && data.length > 0) {
      setCategories(data);
      if (!resCategory) setResCategory(data[0].name);
    }
  };

  // 分类管理
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: newCategoryName });
    if (error) { toast.error("添加失败"); return; }
    setNewCategoryName(""); fetchCategories(); toast.success("分类添加成功");
  };
  const handleDeleteCategory = async (id: number) => {
    if (!confirm("确定删除该分类？")) return;
    await supabase.from("categories").delete().eq("id", id);
    fetchCategories(); toast.success("分类已删除");
  };

  // 资源逻辑
  const handleResourceSubmit = async () => {
    if (!resTitle || !quarkLink) return toast.warning("请填写标题和夸克链接");
    if (!resCategory) return toast.warning("请选择分类");
    if (!editingResourceId && !resFile) return toast.warning("请上传封面图");

    setLoading(true);
    try {
      let coverUrl = "";
      if (resFile) {
        const fileName = `res-${Date.now()}-${resFile.name}`;
        const { error: upErr } = await supabase.storage.from("covers").upload(fileName, resFile);
        if (upErr) throw upErr;
        coverUrl = supabase.storage.from("covers").getPublicUrl(fileName).data.publicUrl;
      }
      const resData = { title: resTitle, category: resCategory, quark_link: quarkLink, baidu_link: baiduLink || null, xunlei_link: xunleiLink || null, ...(coverUrl ? { cover_url: coverUrl } : {}), };

      if (editingResourceId) {
        await supabase.from("resources").update(resData).eq("id", editingResourceId);
        toast.success("资源修改成功！");
      } else {
        if (!coverUrl) throw new Error("新增必须上传封面");
        await supabase.from("resources").insert({ ...resData, cover_url: coverUrl });
        toast.success("资源发布成功！");
      }
      resetResourceForm(); fetchResources();
    } catch (e: any) { toast.error("操作失败: " + e.message); } finally { setLoading(false); }
  };
  const handleEditResource = (res: Resource) => { setEditingResourceId(res.id); setResTitle(res.title); setResCategory(res.category); setQuarkLink(res.quark_link); setBaiduLink(res.baidu_link || ""); setXunleiLink(res.xunlei_link || ""); setResFile(null); resourceFormRef.current?.scrollIntoView({ behavior: 'smooth' }); toast.info("进入资源编辑模式"); };
  const resetResourceForm = () => { setEditingResourceId(null); setResTitle(""); setQuarkLink(""); setBaiduLink(""); setXunleiLink(""); setResFile(null); if (categories.length > 0) setResCategory(categories[0].name); };
  const handleDeleteResource = async (id: number) => { if (!confirm("确定删除？")) return; await supabase.from("resources").delete().eq("id", id); fetchResources(); toast.success("已删除"); if (editingResourceId === id) resetResourceForm(); };
  const recommendResourceToBanner = (res: Resource) => { setActiveTab("banners"); setEditingBannerId(null); setBannerTitle(res.title); setBannerType("resource"); setBannerResourceId(res.id.toString()); toast.info("已跳转轮播设置"); };

  // 文章逻辑
  const imageHandler = useCallback(() => { if (hiddenFileInput.current) hiddenFileInput.current.click(); }, []);
  const handleEditorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const toastId = toast.loading("上传中...");
    try {
      const fileName = `content-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("covers").upload(fileName, file); if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("covers").getPublicUrl(fileName);
      if (quillRef.current) { const editor = quillRef.current.getEditor(); const range = editor.getSelection(); editor.insertEmbed(range ? range.index : 0, "image", publicUrl); }
      toast.success("插入成功", { id: toastId });
    } catch (error: any) { toast.error("失败: " + error.message, { id: toastId }); }
  };
  // 文章用的完整工具栏
  const articleQuillModules = useMemo(() => ({ toolbar: { container: [[{ 'header': [1, 2, 3, false] }], ['bold', 'italic', 'underline', 'strike', 'blockquote'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['link', 'image'], ['clean']], handlers: { image: imageHandler } }, }), [imageHandler]);

  // 🔥 公告用的简化工具栏 (无图片)
  const simpleQuillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ]
  }), []);

  const handleArticleSubmit = async () => {
    if (!articleTitle || !articleContent) return toast.warning("内容不完整");
    if (!editingArticleId && !articleFile) return toast.warning("请上传封面");
    setLoading(true);
    try {
      let coverUrl = "";
      if (articleFile) { const fileName = `art-${Date.now()}-${articleFile.name}`; const { error: upErr } = await supabase.storage.from("covers").upload(fileName, articleFile); if (upErr) throw upErr; coverUrl = supabase.storage.from("covers").getPublicUrl(fileName).data.publicUrl; }
      const articleData = { title: articleTitle, content: articleContent, ...(coverUrl ? { cover_url: coverUrl } : {}), };
      if (editingArticleId) { await supabase.from("articles").update(articleData).eq("id", editingArticleId); toast.success("更新成功"); } else { await supabase.from("articles").insert({ ...articleData, cover_url: coverUrl, view_count: 0 }); toast.success("发布成功"); }
      resetArticleForm(); fetchArticles();
    } catch (e: any) { toast.error("错误: " + e.message); } finally { setLoading(false); }
  };
  const resetArticleForm = () => { setEditingArticleId(null); setArticleTitle(""); setArticleContent(""); setArticleFile(null); };
  const handleEditArticle = (art: Article) => { setEditingArticleId(art.id); setArticleTitle(art.title); setArticleContent(art.content); setArticleFile(null); setIsVisualMode(true); articleFormRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  const handleDeleteArticle = async (id: number) => { if (!confirm("确定删除？")) return; await supabase.from("comments").delete().eq("article_id", id); await supabase.from("articles").delete().eq("id", id); fetchArticles(); toast.success("已删除"); if (editingArticleId === id) resetArticleForm(); };
  const recommendArticleToBanner = (art: Article) => { setActiveTab("banners"); setEditingBannerId(null); setBannerTitle(art.title); setBannerType("link"); setBannerLinkUrl(`/blog/${art.id}`); toast.info("已跳转轮播设置"); };

  // 轮播逻辑
  const handleBannerSubmit = async () => {
    if (!bannerTitle) return toast.warning("请填写标题");
    if (!editingBannerId && !bannerFile) return toast.warning("请上传图片");
    setLoading(true);
    try {
      let publicUrl = "";
      if (bannerFile) { const fileName = `banner-${Date.now()}-${bannerFile.name}`; const { error: upErr } = await supabase.storage.from("covers").upload(fileName, bannerFile); if (upErr) throw upErr; publicUrl = supabase.storage.from("covers").getPublicUrl(fileName).data.publicUrl; }
      const bannerData = { title: bannerTitle, type: bannerType, link_url: bannerType === 'link' ? bannerLinkUrl : null, dialog_content: bannerType === 'dialog' ? bannerDialogContent : null, resource_id: bannerType === 'resource' ? parseInt(bannerResourceId) : null, ...(publicUrl ? { image_url: publicUrl } : {}), };
      if (editingBannerId) { await supabase.from("banners").update(bannerData).eq("id", editingBannerId); toast.success("更新成功"); } else { if (!publicUrl) throw new Error("必须上传图片"); await supabase.from("banners").insert({ ...bannerData, image_url: publicUrl }); toast.success("发布成功"); }
      resetBannerForm(); fetchBanners();
    } catch (e: any) { toast.error("失败: " + e.message); } finally { setLoading(false); }
  };
  const handleEditBanner = (b: Banner) => { setEditingBannerId(b.id); setBannerTitle(b.title); setBannerType(b.type); setBannerLinkUrl(b.link_url || ""); setBannerDialogContent(b.dialog_content || ""); setBannerResourceId(b.resource_id ? b.resource_id.toString() : ""); setBannerFile(null); bannerFormRef.current?.scrollIntoView({ behavior: 'smooth' }); toast.info("编辑模式"); };
  const resetBannerForm = () => { setEditingBannerId(null); setBannerTitle(""); setBannerFile(null); setBannerLinkUrl(""); setBannerDialogContent(""); setBannerResourceId(""); };
  const handleDeleteBanner = async (id: number) => { if(!confirm("确定删除？")) return; await supabase.from("banners").delete().eq("id", id); fetchBanners(); toast.success("已删除"); if (editingBannerId === id) resetBannerForm(); };

  // 评论逻辑
  const handleApproveComment = async (id: number) => { await supabase.from("comments").update({ is_approved: true }).eq("id", id); toast.success("已通过"); fetchPendingComments(); };
  const handleDeleteComment = async (id: number) => { await supabase.from("comments").delete().eq("id", id); toast.success("已删除"); fetchPendingComments(); };

  if (!isLoggedIn) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <Card className="w-[350px]">
            <CardHeader><CardTitle>管理员登录</CardTitle></CardHeader>
            <CardContent className="space-y-4"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /><Button className="w-full" onClick={handleLogin}>登录</Button></CardContent>
          </Card>
        </div>
      );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">🛡️ 站长控制台 V6.0</h1>
        <Button variant="outline" onClick={() => setIsLoggedIn(false)}>退出</Button>
      </div>

      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg sticky top-0 z-10 shadow-sm overflow-x-auto">
        <Button variant={activeTab === 'resources' ? "default" : "ghost"} className="flex-1" onClick={() => setActiveTab('resources')}><FolderOpen className="w-4 h-4 mr-2"/> 资源</Button>
        <Button variant={activeTab === 'articles' ? "default" : "ghost"} className="flex-1" onClick={() => setActiveTab('articles')}><FileText className="w-4 h-4 mr-2"/> 文章</Button>
        <Button variant={activeTab === 'banners' ? "default" : "ghost"} className="flex-1" onClick={() => { setActiveTab('banners'); fetchBanners(); }}><LayoutTemplate className="w-4 h-4 mr-2"/> 轮播</Button>
        <Button variant={activeTab === 'comments' ? "default" : "ghost"} className="flex-1 relative" onClick={() => { setActiveTab('comments'); fetchPendingComments(); }}><MessageSquare className="w-4 h-4 mr-2"/> 审核 {pendingComments.length > 0 && <span className="absolute top-1 right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{pendingComments.length}</span>}</Button>
      </div>

      {/* TAB 1: 资源管理 (包含分类) */}
      {activeTab === 'resources' && (
         <div className="grid gap-8" ref={resourceFormRef}>
         <Card className={editingResourceId ? "border-blue-500 shadow-md" : ""}>
           <CardHeader className="flex flex-row justify-between items-center">
             <CardTitle className="flex items-center gap-2">{editingResourceId ? <><Edit className="w-5 h-5 text-blue-500"/> 修改资源</> : "📤 上传新资源"}</CardTitle>
             {editingResourceId && <Button variant="ghost" size="sm" onClick={resetResourceForm} className="text-gray-500 gap-1"><X className="w-4 h-4"/> 取消编辑</Button>}
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2"><Label>标题</Label><Input value={resTitle} onChange={(e) => setResTitle(e.target.value)} /></div>
               <div className="space-y-2">
                 <Label>分类</Label>
                 <div className="flex gap-2">
                   <select className="flex h-10 w-full rounded-md border border-input px-3 bg-white" value={resCategory} onChange={(e) => setResCategory(e.target.value)}>
                      {categories.map(cat => (<option key={cat.id} value={cat.name}>{cat.name}</option>))}
                      {categories.length === 0 && <option value="">暂无分类</option>}
                   </select>
                   <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                     <DialogTrigger asChild><Button variant="outline" size="icon" title="管理分类"><Settings className="w-4 h-4" /></Button></DialogTrigger>
                     <DialogContent>
                       <DialogHeader><DialogTitle>⚙️ 管理分类</DialogTitle></DialogHeader>
                       <div className="space-y-4 mt-2">
                         <div className="flex gap-2"><Input placeholder="输入新分类名..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} /><Button onClick={handleAddCategory}><Plus className="w-4 h-4 mr-1"/> 添加</Button></div>
                         <div className="border rounded-md p-2 max-h-[300px] overflow-y-auto space-y-2">{categories.map(cat => (<div key={cat.id} className="flex justify-between items-center bg-gray-50 p-2 rounded"><span>{cat.name}</span><Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => handleDeleteCategory(cat.id)}><X className="w-4 h-4"/></Button></div>))}</div>
                       </div>
                     </DialogContent>
                   </Dialog>
                 </div>
               </div>
               <div className="col-span-1 md:col-span-2 space-y-3 bg-gray-50 p-4 rounded border"><Input value={quarkLink} onChange={(e) => setQuarkLink(e.target.value)} placeholder="夸克链接 (必填)" /><div className="grid grid-cols-2 gap-2"><Input value={baiduLink} onChange={(e) => setBaiduLink(e.target.value)} placeholder="百度链接" /><Input value={xunleiLink} onChange={(e) => setXunleiLink(e.target.value)} placeholder="迅雷链接" /></div></div>
               <div className="col-span-1 md:col-span-2"><Label>封面图 {editingResourceId && "(不选则使用原图)"}</Label><Input type="file" onChange={(e) => setResFile(e.target.files?.[0] || null)} /></div>
             </div>
             <Button className={`w-full mt-4 ${editingResourceId ? "bg-blue-600 hover:bg-blue-700" : ""}`} onClick={handleResourceSubmit} disabled={loading}>{loading ? "处理中..." : (editingResourceId ? "保存修改" : "发布资源")}</Button>
           </CardContent>
         </Card>
         <Card><CardHeader><CardTitle>已发布资源</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>标题</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>{resources.map(res => (<TableRow key={res.id}><TableCell className="font-medium truncate max-w-[200px]">{res.title}</TableCell><TableCell className="text-right space-x-1"><Button variant="outline" size="sm" className="text-blue-600 border-blue-200" onClick={() => recommendResourceToBanner(res)}>📺 推</Button><Button variant="ghost" size="sm" onClick={() => handleEditResource(res)}><Edit className="w-4 h-4 text-blue-500"/></Button><Button variant="ghost" size="sm" onClick={() => handleDeleteResource(res.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
       </div>
      )}

      {/* TAB 2: 文章管理 */}
      {activeTab === 'articles' && (
        <div className="grid gap-8" ref={articleFormRef}>
          <input type="file" accept="image/*" ref={hiddenFileInput} className="hidden" onChange={handleEditorImageUpload} />
          <Card className={editingArticleId ? "border-blue-500 shadow-md" : ""}>
            <CardHeader className="flex flex-row justify-between items-center"><CardTitle className="flex items-center gap-2">{editingArticleId ? <><Edit className="w-5 h-5 text-blue-500"/> 修改文章</> : "✍️ 发布文章"}</CardTitle>{editingArticleId && <Button variant="ghost" size="sm" onClick={resetArticleForm} className="text-gray-500 gap-1"><X className="w-4 h-4"/> 取消编辑</Button>}</CardHeader>
            <CardContent className="space-y-4"><Input value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} placeholder="标题" /><Input type="file" onChange={(e) => setArticleFile(e.target.files?.[0] || null)} /><div className="border p-2 min-h-[300px] rounded"><ReactQuill ref={quillRef} theme="snow" value={articleContent} onChange={setArticleContent} modules={articleQuillModules} className="bg-white h-[250px]"/></div><Button className={`w-full mt-8 ${editingArticleId ? "bg-blue-600 hover:bg-blue-700" : ""}`} onClick={handleArticleSubmit}>{editingArticleId ? "更新文章" : "发布文章"}</Button></CardContent>
          </Card>
          <Card><CardHeader><CardTitle>文章列表</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>标题</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>{articles.map(art => (<TableRow key={art.id}><TableCell className="font-medium truncate max-w-[150px]">{art.title}</TableCell><TableCell className="text-right space-x-1"><Button variant="outline" size="sm" className="text-blue-600 border-blue-200" onClick={() => recommendArticleToBanner(art)}>📺 推</Button><Button variant="ghost" size="sm" onClick={() => handleEditArticle(art)}><Edit className="w-4 h-4 text-blue-500"/></Button><Button variant="ghost" size="sm" onClick={() => handleDeleteArticle(art.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
        </div>
      )}

      {/* TAB 3: 轮播图管理 (🔥 升级了编辑器) */}
      {activeTab === 'banners' && (
        <div className="grid gap-8" ref={bannerFormRef}>
          <Card className={`border-purple-500 shadow-md ${editingBannerId ? "ring-2 ring-purple-200" : ""}`}>
            <CardHeader className="flex flex-row justify-between items-center"><CardTitle className="text-purple-700 flex items-center gap-2">{editingBannerId ? <><Edit className="w-5 h-5"/> 修改轮播图</> : <><LayoutTemplate className="w-5 h-5"/> 配置轮播图</>}</CardTitle>{editingBannerId && <Button variant="ghost" size="sm" onClick={resetBannerForm} className="text-gray-500 gap-1"><X className="w-4 h-4"/> 取消编辑</Button>}</CardHeader>
            <CardContent className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>标题</Label><Input value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} /></div><div className="space-y-2"><Label>类型</Label><select className="flex h-10 w-full rounded-md border border-input px-3 bg-white" value={bannerType} onChange={(e) => setBannerType(e.target.value as any)}><option value="link">🔗 跳转链接</option><option value="resource">📂 打开资源</option><option value="dialog">📢 弹窗公告</option></select></div></div>
              <div className="bg-gray-50 p-4 rounded-lg border">
                {bannerType === 'link' && <div className="space-y-2"><Label>链接</Label><Input value={bannerLinkUrl} onChange={(e) => setBannerLinkUrl(e.target.value)} placeholder="https://..." /></div>}

                {/* 🔥 升级：公告内容改为富文本编辑器 */}
                {bannerType === 'dialog' && (
                  <div className="space-y-2">
                    <Label>公告内容</Label>
                    <div className="bg-white">
                      <ReactQuill theme="snow" modules={simpleQuillModules} value={bannerDialogContent} onChange={setBannerDialogContent} />
                    </div>
                  </div>
                )}

                {bannerType === 'resource' && <div className="space-y-2"><Label>资源ID</Label><Input value={bannerResourceId} onChange={(e) => setBannerResourceId(e.target.value)} /></div>}
              </div>
              <div className="space-y-2"><Label className="text-purple-600">封面图 {editingBannerId && "(不选则使用原图)"}</Label><Input type="file" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} /></div><Button className={`w-full ${editingBannerId ? "bg-purple-700 hover:bg-purple-800" : "bg-purple-600 hover:bg-purple-700"}`} onClick={handleBannerSubmit} disabled={loading}>{loading ? "处理中..." : (editingBannerId ? "保存修改" : "发布轮播")}</Button></CardContent>
          </Card>
          <Card><CardHeader><CardTitle>当前轮播</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>封面</TableHead><TableHead>标题</TableHead><TableHead>类型</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>{banners.map(b => (<TableRow key={b.id}><TableCell><img src={b.image_url} className="w-20 h-6 object-cover rounded" /></TableCell><TableCell className="font-medium">{b.title}</TableCell><TableCell><Badge variant="outline">{b.type}</Badge></TableCell><TableCell className="text-right space-x-1"><Button variant="ghost" size="sm" onClick={() => handleEditBanner(b)}><Edit className="w-4 h-4 text-purple-500"/></Button><Button variant="ghost" size="sm" onClick={() => handleDeleteBanner(b.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
        </div>
      )}
    </div>
  );
}
