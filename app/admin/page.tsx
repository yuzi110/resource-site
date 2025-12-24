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
  is_pinned?: boolean; // 新增置顶字段
}

interface Article {
  id: number;
  title: string;
  cover_url: string;
  content: string;
  created_at: string;
  status?: string;
  designation?: string;
  category?: string;
  is_pinned?: boolean;
}

interface PendingComment {
  id: number;
  nickname: string;
  content: string;
  created_at: string;
  article_id: number;
  parent_id?: number;
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

  // 文章编辑扩展状态
  const [articleCategory, setArticleCategory] = useState("all");
  const [articlePinned, setArticlePinned] = useState(false);

  // 分类状态
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  // 图片上传助手状态
  const [helperFile, setHelperFile] = useState<File | null>(null);
  const [helperUrl, setHelperUrl] = useState("");
  const [helperLoading, setHelperLoading] = useState(false);

  const handleHelperUpload = async () => {
    if (!helperFile) return;
    setHelperLoading(true);
    try {
      const fileExt = helperFile.name.split('.').pop();
      const fileName = `helper-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      // 使用正确的 bucket 名称: 'covers'
      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(fileName, helperFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(fileName);

      setHelperUrl(publicUrl);
      toast.success("上传成功！链接已生成");
    } catch (error) {
      console.error(error);
      toast.error("上传失败");
    } finally {
      setHelperLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("已复制到剪贴板");
  };

  const insertToEditor = (url: string) => {
    if (!quillRef.current) {
      toast.error("编辑器未就绪");
      return;
    }

    // 🔥 关键优化：使用 Next.js Image Optimization API
    // 这样插入富文本的图片，会通过 Next.js 服务器进行实时压缩和格式转换 (WebP)
    // w=1080 限制最大宽度, q=75 是最佳画质/体积平衡点
    const optimizedUrl = `/_next/image?url=${encodeURIComponent(url)}&w=1080&q=75`;

    const editor = quillRef.current.getEditor();
    const range = editor.getSelection();
    const index = range ? range.index : editor.getLength();

    // 插入优化后的 URL
    editor.insertEmbed(index, "image", optimizedUrl);
    toast.success("已插入压缩后的图片 ✅");
  };

  // 资源表单
  const [resFile, setResFile] = useState<File | null>(null);
  const [resTitle, setResTitle] = useState("");
  const [resCategory, setResCategory] = useState("");
  const [resPinned, setResPinned] = useState(false); // 新增资源置顶状态
  const [quarkLink, setQuarkLink] = useState("");
  const [baiduLink, setBaiduLink] = useState("");
  const [xunleiLink, setXunleiLink] = useState("");
  const [editingResourceId, setEditingResourceId] = useState<number | null>(null);
  const resourceFormRef = useRef<HTMLDivElement>(null);

  // 文章表单
  const [articleTitle, setArticleTitle] = useState("");
  const [designation, setDesignation] = useState(""); // 🔥 新增番号字段
  const [articleContent, setArticleContent] = useState("");
  const [articleFile, setArticleFile] = useState<File | null>(null);
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);
  const articleFormRef = useRef<HTMLDivElement>(null);
  const [isVisualMode, setIsVisualMode] = useState(true);

  // 切换编辑器模式
  const toggleEditorMode = () => {
    setIsVisualMode(!isVisualMode);
  };

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
  const SECRET_CODE = "110110";

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
  const fetchResources = async () => {
    const { data } = await supabase
      .from("resources")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("id", { ascending: false });
    if (data) setResources(data);
  };
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
        const fileExt = resFile.name.split('.').pop();
        const fileName = `res-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: upErr } = await supabase.storage.from("covers").upload(fileName, resFile);
        if (upErr) throw upErr;
        coverUrl = supabase.storage.from("covers").getPublicUrl(fileName).data.publicUrl;
      }
      const resData = {
        title: resTitle,
        category: resCategory,
        quark_link: quarkLink,
        baidu_link: baiduLink || null,
        xunlei_link: xunleiLink || null,
        is_pinned: resPinned, // 保存置顶状态
        ...(coverUrl ? { cover_url: coverUrl } : {}),
      };

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
  const handleEditResource = (res: Resource) => {
    setEditingResourceId(res.id);
    setResTitle(res.title);
    setResCategory(res.category);
    setResPinned(res.is_pinned || false); // 加载置顶状态
    setQuarkLink(res.quark_link);
    setBaiduLink(res.baidu_link || "");
    setXunleiLink(res.xunlei_link || "");
    setResFile(null);
    resourceFormRef.current?.scrollIntoView({ behavior: 'smooth' });
    toast.info("进入资源编辑模式");
  };
  const resetResourceForm = () => {
    setEditingResourceId(null);
    setResTitle("");
    setResPinned(false); // 重置置顶状态
    setQuarkLink("");
    setBaiduLink("");
    setXunleiLink("");
    setResFile(null);
    if (categories.length > 0) setResCategory(categories[0].name);
  };
  const handleDeleteResource = async (id: number) => { if (!confirm("确定删除？")) return; await supabase.from("resources").delete().eq("id", id); fetchResources(); toast.success("已删除"); if (editingResourceId === id) resetResourceForm(); };
  const handleTogglePin = async (res: Resource) => {
    try {
      const newPinnedState = !res.is_pinned;
      const { error } = await supabase
        .from("resources")
        .update({ is_pinned: newPinnedState })
        .eq("id", res.id);

      if (error) throw error;

      toast.success(newPinnedState ? "已置顶" : "已取消置顶");
      fetchResources();
    } catch (e: any) {
      toast.error("操作失败: " + e.message);
    }
  };
  const recommendResourceToBanner = (res: Resource) => { setActiveTab("banners"); setEditingBannerId(null); setBannerTitle(res.title); setBannerType("resource"); setBannerResourceId(res.id.toString()); toast.info("已跳转轮播设置"); };

  // 文章逻辑
  const imageHandler = useCallback(() => { if (hiddenFileInput.current) hiddenFileInput.current.click(); }, []);
  const handleEditorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const toastId = toast.loading("上传中...");
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `content-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error: upErr } = await supabase.storage.from("covers").upload(fileName, file); if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("covers").getPublicUrl(fileName);
      if (quillRef.current) { const editor = quillRef.current.getEditor(); const range = editor.getSelection(); editor.insertEmbed(range ? range.index : 0, "image", publicUrl); }
      toast.success("插入成功", { id: toastId });
    } catch (error: any) { toast.error("失败: " + error.message, { id: toastId }); }
  };
  // 文章用的完整工具栏
  const articleQuillModules = useMemo(() => ({ toolbar: { container: [[{ 'header': [1, 2, 3, false] }], ['bold', 'italic', 'underline', 'strike', 'blockquote'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], [{ 'align': [] }], ['link', 'image'], ['clean']], handlers: { image: imageHandler } }, }), [imageHandler]);

  // 🔥 公告用的简化工具栏 (无图片)
  const simpleQuillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['clean']
    ]
  }), []);

  // 🛡️ 图像保留助手：提取旧内容中的图片，追加到新内容后
  const preserveImages = (oldContent: string, newContentBody: string) => {
    // 简单提取 img 标签
    const imgRegex = /<img[^>]+>/g;
    const matches = oldContent.match(imgRegex) || [];

    if (matches.length === 0) return newContentBody;

    // 过滤掉已经在新内容里的图片（虽然新内容通常只有文字，但为了保险）
    const uniqueImages = matches.filter(img => !newContentBody.includes(img));

    if (uniqueImages.length === 0) return newContentBody;

    const imagesHtml = uniqueImages.map(img => `<p>${img}</p>`).join("");
    return `${newContentBody}<br/><hr/><h4>🖼️ 原文已存图片（请手动拖拽排版）</h4>${imagesHtml}`;
  };



  // 河北彩伽 演示文案填充
  const fillKawakitaDemo = () => {
    const title = "【重磅回归】短发河北彩伽 (Kawakita Saika) 降临！S1 演绎“失控的周末”";
    const body = `
<p>2026 年 1 月，<strong>河北彩伽 (Kawakita Saika)</strong> 回来了！</p>
<p>古人说一日不见如隔三秋，更何况她上个月没有发片，真叫人格外想念。而在 S1 发布的这部新作封面中，我们可以发现一个重大变化：<strong>河北彩伽换发型了，这次她以俐落的短发造型亮相！</strong></p>

<h4>💇‍♀️ 新造型首秀：迟来的“短发惊喜”</h4>
<p>虽然关注她社交媒体的粉丝都知道她剪短发有一阵子了，但由于业界作品从制作到发行通常需要半年的周期，所以直到 2026 年 1 月，我们才在正式作品中看到这个新造型。不得不说，短发的她更显干练与知性，非常契合这次的剧本设定。</p>

<h4>🍷 剧情解析：酒后失控的“荒唐周末”</h4>
<p>这部作品的标题很长，简单来说就是：<strong>酒后越线的一夜，演变成了停不下来的周末。</strong></p>
<p><strong>故事开端：</strong> 河北彩伽醒来后，发现身边躺着的是呼呼大睡的朋友——有着“暗黑翔平”之称的 <strong>蓝井优太</strong>。昨晚的记忆断片了，但垃圾桶里的痕迹告诉她：他们越过了那条线。</p>
<p><strong>心理博弈：</strong> “我们这样，不对吧？”虽然嘴上这么说，但面对同样一头雾水却又充满男性魅力的蓝井优太，两人陷入了尴尬而又微妙的氛围。既然想不起昨晚的细节，那就……<strong>再确认一次吧。</strong></p>

<h4>🔥 演技爆发：不是情侣，更胜情侣</h4>
<p>这个企划的核心看点在于<strong>“身体的契合度”</strong>与<strong>“理性的崩塌”</strong>。</p>
<p>明明两人都觉得这样不好（河北甚至还设定有男友之约），但身体却太诚实了。从早晨的晨间互动，到午后的意乱情迷，整个周末他们几乎就没有分开过。蓝井优太那种“轻浮男”的设定，配合河北彩伽“半推半就后彻底沉沦”的演技，化学反应简直炸裂。</p>
<p>这种<strong>“不是情侣却更胜情侣”</strong>的激烈交战，往往比正经的恋爱剧更有张力。看着短发造型的河北彩伽，在特写镜头下展现出极致的妩媚与投入，那种视觉冲击力足以让所有观众心跳加速。</p>

<h4>💡 严选点评</h4>
<p>虽然作品口味不算重，但胜在<strong>真实感</strong>与<strong>代入感</strong>。河北彩伽用实力证明了：无论长发还是短发，她依然是那个能统御业界的王者。2026 年，请继续被她征服吧！</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #河北彩伽 #KawakitaSaika #S1 #短发首秀 #蓝井优太 #酒后越线 #周末情侣</p>
    `;
    setArticleTitle(title);
    setArticleContent(preserveImages(articleContent, body));
    toast.success("河北彩伽文案已优化（原图已保留在底部）");
  };

  // 榊原萌 演示文案填充
  const fillSakakibaraDemo = () => {
    const title = "【极限挑战】S1 玩真的？次世代偶像榊原萌 (Sakakibara Moe) 泪洒片场，12小时“多人共演”解禁！";
    const body = `
<p>是的，制作商 <strong>S1</strong> 终于对可爱的 <strong>榊原萌 (榊原萌)</strong> 下手了。</p>
<p>在业界，除了那个拥有“不灭金身”的河北彩伽，似乎没有哪位专属艺人能逃过 S1 的“多人共演”洗礼。就连金松季步这样的艺能人出身都未能幸免。而这次，S1 不仅安排了豪华的男演员阵容，还加入了<strong>“特殊道具”</strong>的设定。</p>

<h4>🧪 剧情设定：谎言与“魔法”</h4>
<p>剧情主打一个“骗”字。设定中，天真活泼的榊原萌以为只是普通的拍摄，却不知道自己即将面临的是一场<strong>长达 12 小时的极限挑战</strong>。</p>
<p>虽然她在片中明确拒绝使用“增强氛围的道具”，但在不知情的情况下，这些道具还是发挥了作用。这种<strong>“清纯偶像被迫染上色彩”</strong>的反差感，一直是 S1 的拿手好戏。</p>

<h4>🎭 演技爆发：12小时的生理与心理煎熬</h4>
<p>这 12 小时发生了什么？</p>
<p>在道具的作用下，榊原萌展现出了前所未有的<strong>高敏感度</strong>。面对男演员们如潮水般的攻势，她的反应极其真实：从最初的抗拒，到身体不受控制的颤抖，再到最后眼神迷离的彻底释放。</p>
<p><strong>6人、7人，甚至达到9人</strong>的超豪华共演阵容，让这位美少女应接不暇。从排队等待她的亲密互动，到最后的全员上阵，这种<strong>Non-Stop</strong>的拍摄强度，对体力和精神都是巨大的考验。</p>

<h4>💧 “大号泣”背后：真实的残酷物语</h4>
<p>制作商在预告中打出了<strong>“大号泣”</strong>的字样。看着她边演边哭的样子，真的让人感到一丝心疼。</p>
<p>据曾参与过类似企划的艺人透露，虽然现场工作人员非常专业，但这种“多人共演”本身就是<strong>地狱级的硬仗</strong>。拍完后不仅腿软，甚至可能在很长一段时间内都会对“互动”产生心理阴影。</p>

<h4>💡 严选点评：销量的代价</h4>
<p>没办法，这就是业界。为了刺激销量，即便是被视为“次世代偶像接班人”的榊原萌，也必须经历这种磨练。</p>
<p>不过，细心的粉丝可能发现了一个 <strong>BUG</strong>：虽然设定中她拒绝道具，但她上个月的作品标题里明明就写着“被注射了强力道具”。这大概是制作商企划没做好交接，或者是为了配合这次的剧情强行加的设定吧。但无论如何，榊原萌在片中那种<strong>无助、脆弱又不得不接受</strong>的样子，确实极具感染力。</p>
<p><strong>加油，榊原萌！</strong></p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #榊原萌 #SakakibaraMoe #S1 #多人共演 #极限挑战 #偶像堕落 #大号泣</p>
    `;
    setArticleTitle(title);
    setArticleContent(preserveImages(articleContent, body));
    toast.success("榊原萌文案已优化（原图已保留在底部）");
  };

  // --- 演示文案配置 ---
  const demoTemplates = [
    { id: 'kawakita', label: '💇‍♀️ 河北彩伽', action: fillKawakitaDemo, style: 'border-orange-200 text-orange-600 hover:bg-orange-50' },
    { id: 'sakakibara', label: '💧 榊原萌', action: fillSakakibaraDemo, style: 'border-blue-300 text-blue-700 hover:bg-blue-100' },
  ];

  // 隐藏演示按钮状态
  const [hiddenDemoIds, setHiddenDemoIds] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedHidden = localStorage.getItem('admin_hidden_demos');
    if (storedHidden) {
      setHiddenDemoIds(JSON.parse(storedHidden));
    }
  }, []);

  const handleHideDemo = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // 防止触发填充
    const newHidden = [...hiddenDemoIds, id];
    setHiddenDemoIds(newHidden);
    localStorage.setItem('admin_hidden_demos', JSON.stringify(newHidden));
    toast.success("已隐藏该模板（刷新后依然隐藏）");
  };

  const handleArticleSubmit = async (status: 'published' | 'draft' = 'published') => {
    if (!articleTitle || !articleContent) return toast.warning("内容不完整");
    if (!editingArticleId && !articleFile) return toast.warning("请上传封面");
    setLoading(true);
    try {
      let coverUrl = "";
      if (articleFile) {
        const fileExt = articleFile.name.split('.').pop();
        const fileName = `art-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: upErr } = await supabase.storage.from("covers").upload(fileName, articleFile);
        if (upErr) throw upErr;
        coverUrl = supabase.storage.from("covers").getPublicUrl(fileName).data.publicUrl;
      }

      const articleData = {
        title: articleTitle,
        content: articleContent,
        status,
        designation,
        category: articleCategory,
        is_pinned: articlePinned,
        ...(coverUrl ? { cover_url: coverUrl } : {}),
      };

      if (editingArticleId) { await supabase.from("articles").update(articleData).eq("id", editingArticleId); toast.success(status === 'published' ? "更新并发布" : "草稿已保存"); } else { await supabase.from("articles").insert({ ...articleData, cover_url: coverUrl, view_count: 0 }); toast.success(status === 'published' ? "发布成功" : "草稿已保存"); }
      resetArticleForm(); fetchArticles();
    } catch (e: any) { toast.error("错误: " + e.message); } finally { setLoading(false); }
  };
  const resetArticleForm = () => {
    setEditingArticleId(null);
    setArticleTitle("");
    setDesignation("");
    setArticleContent("");
    setArticleFile(null);
    setArticleCategory("all");
    setArticlePinned(false);
  };
  const handleEditArticle = (art: Article) => {
    setEditingArticleId(art.id);
    setArticleTitle(art.title);
    setDesignation(art.designation || "");
    setArticleContent(art.content);
    setArticleCategory(art.category || "all");
    setArticlePinned(art.is_pinned || false);
    setArticleFile(null);
    setIsVisualMode(true);
    articleFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  const handleDeleteArticle = async (id: number) => { if (!confirm("确定删除？")) return; await supabase.from("comments").delete().eq("article_id", id); await supabase.from("articles").delete().eq("id", id); fetchArticles(); toast.success("已删除"); if (editingArticleId === id) resetArticleForm(); };
  const recommendArticleToBanner = (art: Article) => { setActiveTab("banners"); setEditingBannerId(null); setBannerTitle(art.title); setBannerType("link"); setBannerLinkUrl(`/blog/${art.id}`); toast.info("已跳转轮播设置"); };

  // 轮播逻辑
  const handleBannerSubmit = async () => {
    if (!bannerTitle) return toast.warning("请填写标题");
    if (!editingBannerId && !bannerFile) return toast.warning("请上传图片");
    setLoading(true);
    try {
      let publicUrl = "";
      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `banner-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: upErr } = await supabase.storage.from("covers").upload(fileName, bannerFile);
        if (upErr) throw upErr;
        publicUrl = supabase.storage.from("covers").getPublicUrl(fileName).data.publicUrl;
      }
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
            <CardContent className="space-y-4">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <Button className="w-full" onClick={handleLogin}>登录</Button>
            </CardContent>
          </Card>
        </div>
      );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl pb-20">
      {/* 全局样式覆盖：让编辑器内的图片显示圆角 */}
      <style jsx global>{`
        .ql-editor img {
          border-radius: 0.5rem;
          margin-top: 1rem;
          margin-bottom: 1rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          max-width: 100%;
          height: auto;
        }
      `}</style>
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
               <div className="col-span-1 md:col-span-2 space-y-3 bg-gray-50 p-4 rounded border"><Input value={quarkLink} onChange={(e) => setQuarkLink(e.target.value)} placeholder="夸克链接 (必填)" /><div className="grid grid-cols-2 gap-2"><Input value={baiduLink} onChange={(e) => setBaiduLink(e.target.value)} placeholder="百度链接" /><Input value={xunleiLink} onChange={(e) => setXunleiLink(e.target.value)} placeholder="迅雷链接" /></div>
               <div className="flex items-center gap-2 mt-2">
                 <input type="checkbox" id="resPinned" checked={resPinned} onChange={(e) => setResPinned(e.target.checked)} className="w-4 h-4" />
                 <label htmlFor="resPinned" className="text-sm font-bold text-red-500 flex items-center gap-1"><LinkIcon className="w-3 h-3"/> 置顶此资源</label>
               </div>
               </div>
               <div className="col-span-1 md:col-span-2"><Label>封面图 {editingResourceId && "(不选则使用原图)"}</Label><Input type="file" onChange={(e) => setResFile(e.target.files?.[0] || null)} /></div>
             </div>
             <Button className={`w-full mt-4 ${editingResourceId ? "bg-blue-600 hover:bg-blue-700" : ""}`} onClick={handleResourceSubmit} disabled={loading}>{loading ? "处理中..." : (editingResourceId ? "保存修改" : "发布资源")}</Button>
           </CardContent>
         </Card>
         <Card><CardHeader><CardTitle>已发布资源</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>标题</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>{resources.map(res => (<TableRow key={res.id}><TableCell className="font-medium truncate max-w-[400px] flex items-center gap-2">{res.title}{res.is_pinned && <Badge variant="destructive" className="h-5 text-[10px]">置顶</Badge>}</TableCell><TableCell className="text-right space-x-1"><Button variant="outline" size="sm" className={res.is_pinned ? "text-red-600 border-red-200 bg-red-50" : "text-gray-600 border-gray-200"} onClick={() => handleTogglePin(res)}>{res.is_pinned ? <><Megaphone className="w-3 h-3 mr-1"/>取消</> : <><LinkIcon className="w-3 h-3 mr-1"/>置顶</>}</Button><Button variant="outline" size="sm" className="text-blue-600 border-blue-200" onClick={() => recommendResourceToBanner(res)}>📺 推</Button><Button variant="ghost" size="sm" onClick={() => handleEditResource(res)}><Edit className="w-4 h-4 text-blue-500"/></Button><Button variant="ghost" size="sm" onClick={() => handleDeleteResource(res.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
       </div>
      )}

      {/* TAB 2: 文章管理 */}
      {activeTab === 'articles' && (
        <div className="grid gap-8" ref={articleFormRef}>
          {/* 🖼️ 图片上传助手 (新增) */}
          <Card className="bg-blue-50 border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <div className="p-1 bg-blue-200 rounded text-blue-700"><FolderOpen className="w-3 h-3" /></div>
                图片上传助手 (获取 URL 插入正文)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    className="bg-white"
                    onChange={(e) => setHelperFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button
                  onClick={handleHelperUpload}
                  disabled={!helperFile || helperLoading}
                  variant="secondary"
                  className="bg-blue-200 text-blue-800 hover:bg-blue-300"
                >
                  {helperLoading ? "上传中..." : "上传并生成链接"}
                </Button>
              </div>

              {helperUrl && (
                <div className="mt-4 p-3 bg-white rounded border flex items-center justify-between gap-2">
                  <code className="text-xs text-gray-500 break-all flex-1">{helperUrl}</code>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => insertToEditor(helperUrl)}
                      className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      ⤵ 插入正文
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(helperUrl)}
                      className="h-7 text-xs"
                    >
                      复制
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <input type="file" accept="image/*" ref={hiddenFileInput} className="hidden" onChange={handleEditorImageUpload} />
          <Card className={editingArticleId ? "border-blue-500 shadow-md" : ""}>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                {editingArticleId ? <><Edit className="w-5 h-5 text-blue-500"/> 修改文章</> : "✍️ 发布文章"}
                {!editingArticleId && isClient && (
                  <div className="flex gap-2 ml-4 flex-wrap">
                    {demoTemplates.map((demo) => (
                      !hiddenDemoIds.includes(demo.id) && (
                        <div key={demo.id} className="relative group">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={demo.action}
                            className={`text-xs ${demo.style} pr-7`}
                          >
                            {demo.label}
                          </Button>
                          <div
                            onClick={(e) => handleHideDemo(e, demo.id)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/10 cursor-pointer opacity-50 hover:opacity-100 transition-all"
                            title="隐藏此模板"
                          >
                            <X className="w-3 h-3 text-current" />
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </CardTitle>
              {editingArticleId && <Button variant="ghost" size="sm" onClick={resetArticleForm} className="text-gray-500 gap-1"><X className="w-4 h-4"/> 取消编辑</Button>}
            </CardHeader>
            <CardContent className="space-y-4">
              <Input value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} placeholder="标题" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="神秘代码 (可选)" className="border-pink-200 focus:border-pink-500" />
                <div className="flex gap-4">
                  <select
                      className="flex h-10 w-full rounded-md border border-input px-3 bg-white text-sm"
                      value={articleCategory}
                      onChange={(e) => setArticleCategory(e.target.value)}
                  >
                      <option value="all">📁 全部分类</option>
                      <option value="newcomer">👶 新人</option>
                      <option value="new_work">🎬 新作</option>
                      <option value="news">📰 新闻</option>
                  </select>
                  <div className="flex items-center gap-2 shrink-0 border px-3 rounded-md bg-white">
                      <input
                          type="checkbox"
                          id="pinned"
                          checked={articlePinned}
                          onChange={(e) => setArticlePinned(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="pinned" className="text-sm font-medium text-gray-700 select-none cursor-pointer">🔝 置顶</label>
                  </div>
                </div>
              </div>
              <Input type="file" onChange={(e) => setArticleFile(e.target.files?.[0] || null)} />
              <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>内容详情</Label>
                    <Button variant="outline" size="sm" onClick={toggleEditorMode} className="text-xs h-7">
                      {isVisualMode ? "</> 切换到源码模式" : "👁️ 切换到可视化模式"}
                    </Button>
                  </div>
                  {isVisualMode ? (
                    <ReactQuill
                      ref={quillRef}
                      theme="snow"
                      value={articleContent}
                      onChange={setArticleContent}
                      modules={articleQuillModules}
                      className="bg-white h-[400px] mb-12"
                    />
                  ) : (
                    <div className="relative">
                      <textarea
                        className="w-full h-[400px] p-4 font-mono text-sm bg-gray-900 text-green-400 rounded-md focus:outline-none resize-y"
                        value={articleContent}
                        onChange={(e) => setArticleContent(e.target.value)}
                        placeholder="在此粘贴 HTML 代码..."
                      />
                      <div className="absolute top-2 right-2 text-xs text-gray-500 select-none">HTML Source Mode</div>
                     </div>
                   )}
                 </div><div className="flex gap-4 mt-8"><Button variant="outline" className="flex-1 border-gray-400 text-gray-600" onClick={() => handleArticleSubmit('draft')}>💾 存为草稿</Button><Button className={`flex-[2] ${editingArticleId ? "bg-blue-600 hover:bg-blue-700" : ""}`} onClick={() => handleArticleSubmit('published')}>{editingArticleId ? "更新并发布" : "🚀 立即发布"}</Button></div></CardContent>
            </Card>
          <Card><CardHeader><CardTitle>文章列表</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>标题</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>{articles.map(art => (<TableRow key={art.id}><TableCell className="font-medium truncate max-w-[300px] md:max-w-[500px] flex items-center gap-2">{art.title}{art.status === 'draft' && <Badge variant="secondary" className="text-[10px] h-5 px-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-200">草稿</Badge>}</TableCell><TableCell className="text-right space-x-1"><Button variant="outline" size="sm" className="text-blue-600 border-blue-200" onClick={() => recommendArticleToBanner(art)}>📺 推</Button><Button variant="ghost" size="sm" onClick={() => handleEditArticle(art)}><Edit className="w-4 h-4 text-blue-500"/></Button><Button variant="ghost" size="sm" onClick={() => handleDeleteArticle(art.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
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

      {/* TAB 4: 评论审核 */}
      {activeTab === 'comments' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-yellow-500"/> 待审核留言
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingComments.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-100" />
                <p>暂无待审核留言，一片清净 ~</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>内容</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingComments.map((comment) => (
                    <TableRow key={comment.id}>
                      <TableCell className="font-bold whitespace-nowrap">{comment.nickname}</TableCell>
                      <TableCell className="max-w-[300px]">
                          <div className="text-sm text-gray-800 break-words">{comment.content}</div>
                          <div className="text-xs text-gray-400 mt-1 flex gap-2">
                            <span>文章ID: {comment.article_id}</span>
                            {comment.parent_id && <span className="bg-blue-100 text-blue-600 px-1 rounded">回复ID: {comment.parent_id}</span>}
                          </div>
                        </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApproveComment(comment.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> 通过
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> 删除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
