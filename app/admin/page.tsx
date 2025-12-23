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

  // 七嶋舞 演示文案填充
  const fillMaiDemo = () => {
    const title = "【重磅解禁】(PRVR-047) 苦等4年！“真人版 Hello Kitty”七嶋舞 (Nanashima Mai) 终于立体化了！";
    const body = `
<p>2021 年 6 月出道至今，粉丝们苦等了 4 年多，那个被称为<strong>“真人版 Hello Kitty”</strong>的完美美少女——<strong>七嶋舞 (七嶋舞)</strong>，终于迎来了她的第一支 VR 作品！</p>
<p>这不仅是七嶋舞个人的突破，更是制作商 <strong>Prestige</strong> 的一次罕见操作。</p>

<h4>🕶️ Prestige 的 VR 困境：为什么这么难？</h4>
<p>熟悉 Prestige 的朋友都知道，这家制作商对 VR 并不感冒。上一支 VR 作品还要追溯到去年 6 月的<strong>凉森玲梦</strong>，中间整整断档了一年半。</p>
<p>而在 S1 这种大厂，演员通常出道第 3、4 作就会安排 VR 拍摄。所以，七嶋舞这次的 VR 解禁，含金量极高。她甚至跳过了<strong>铃村爱里</strong>和<strong>八挂海</strong>这两位前辈，直接拿到了这个宝贵的 VR 资源。这足以证明制作商对她的重视程度。</p>

<h4>🎀 零距离接触“无死角美少女”</h4>
<p>七嶋舞之所以被称为“真人版 Hello Kitty”，就是因为她那张<strong>精致到甚至有点不真实</strong>的脸蛋，以及完全没有死角的完美身材。</p>
<p>在 2D 屏幕里，她已经足够可爱了；而在 VR 的 3D 视野下，这种冲击力是指数级上升的：</p>
<ul>
<li><strong>超近距离对视</strong>：你能清晰地看到她那双无辜的大眼睛就在你面前眨动，仿佛能感受到她的呼吸。</li>
<li><strong>沉浸式体验</strong>：当她靠近你或者凑近互动时，那种<strong>“虽然碰不到，但感觉就在怀里”</strong>的真实感，绝对能让你心跳加速。</li>
</ul>

<h4>💡 严选点评</h4>
<p>虽然来得晚了一些，但这绝对是值得等待的。</p>
<p>对于七嶋舞的粉丝来说，这是一次圆梦的机会；对于 VR 爱好者来说，这更是一场视觉盛宴。希望这次的销量能打动制作商，以后多拍点 VR 吧（铃村爱里还没拍呢！）。</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #七嶋舞 #NanashimaMai #Prestige #VR解禁 #HelloKitty #无死角美少女</p>
<p><strong>📌 番号：</strong> PRVR-047<br>
<strong>📅 发行日：</strong> 2026/01/10</p>
    `;
    setArticleTitle(title);
    setArticleContent(preserveImages(articleContent, body));
    toast.success("七嶋舞文案已优化（原图已保留在底部）");
  };

  // 役野满里奈 演示文案填充
  const fillMarinaDemo = () => {
    const title = "【业界速报】无预警移籍！H罩杯“肉体无双”役野满里奈 (Yakuno Marina) 降临 OPPAI";
    const body = `
<p>最近业界的新陈代谢真的很激烈。继明里紬和 RARA 离开 Faleno 之后，<strong>Ideapocket (IP社)</strong> 也失去了一员大将——<strong>役野满里奈 (役野満里奈)</strong>。</p>
<p>2026 年 1 月，她正式移籍到了以“傲人身材”闻名的制作商 <strong>OPPAI</strong>。从 IP社 到 OPPAI，这波操作背后到底有什么玄机？</p>

<h4>📉 是降级还是重生？</h4>
<p>坦白说，以制作商等级来看，从 IP社 到 OPPAI 确实算是“降级”。毕竟 IP社 是业界顶流，而 OPPAI 更多是针对特定受众。</p>
<p>但对于役野满里奈来说，这或许是<strong>最好的安排</strong>：</p>
<ul>
<li><strong>竞争压力</strong>：IP社 众星云集，樱空桃、长滨蜜璃等神仙打架，役野虽然条件优越，但难免被分流资源。</li>
<li><strong>宁做核心</strong>：到了 OPPAI，凭借她那<strong>H罩杯的无双肉体</strong>和极具偶像气质的颜值，她绝对是妥妥的“王牌”待遇。</li>
</ul>

<h4>🔥 肉体无双再进化：OPPAI 的正确打开方式</h4>
<p>OPPAI 这家制作商最懂什么？当然是<strong>魅力</strong>。</p>
<p>在新东家的首作中，文案直接打出了“魅力觉醒”的旗号。不同于 IP社 时期那种偏唯美的偶像包装，OPPAI 的镜头更加<strong>直白、热烈</strong>：</p>
<ul>
<li><strong>特写暴击</strong>：镜头会毫不避讳地怼到她的细节，记录下每一个细微的生理反应。</li>
<li><strong>高强度实战</strong>：多人互动、丰富的场景设计、激烈的运动……役野满里奈在片中展现出了前所未有的<strong>“大胆”一面</strong>。敏感的身体被刺激时的颤抖，被冲击时的声音，都让人看到了一个完全觉醒的她。</li>
</ul>

<h4>💡 严选点评</h4>
<p>虽然离开 IP社 让人有点遗憾，但役野满里奈在 OPPAI 的表现绝对没有让人失望。</p>
<p>她用实力证明了：<strong>只要身材够顶，在哪里都能发光。</strong> 如果你喜欢<strong>傲人身材</strong>、<strong>肉感身材</strong>以及<strong>更激烈的精彩演出</strong>，役野满里奈的这次移籍，绝对是你的福音。</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #役野满里奈 #YakunoMarina #OPPAI #移籍 #H罩杯 #肉体无双</p>
    `;
    setArticleTitle(title);
    setArticleContent(preserveImages(articleContent, body));
    toast.success("役野满里奈文案已优化（原图已保留在底部）");
  };

  // 山岸绮花 演示文案填充
  const fillAyakaDemo = () => {
    const title = "【引退纪念】(PRED-547) 最后的“毕业作”！山岸绮花 (Yamagishi Ayaka) 生涯终极一舞";
    const body = `
<p>天下没有不散的宴席，但这场离别来得太突然。</p>
<p>这是 <strong>山岸绮花 (山岸あや花)</strong> 生涯的最后一部作品。制作商 Premium 在封面上打出了<strong>“卒业 FINAL”</strong>的字样，宣告这位超一流演员正式告别影像舞台。</p>

<h4>🎓 为什么是“毕业”而不是“引退”？</h4>
<p>虽然业界常用“卒业（毕业）”来美化离别，但这支作品确实充满了<strong>仪式感</strong>：</p>
<ul>
<li><strong>回春精油企划</strong>：这是她最擅长的领域之一。在片中，她化身为专业的精油按摩师，用最温柔的手法和最火辣的身材，为搭档（也为屏幕前的观众）进行最后一次“排毒”。</li>
<li><strong>高音质收录</strong>：为了让粉丝记住她的声音，制作商特意采用了高规格的录音设备。她的每一次<strong>耳边低语</strong>、每一次<strong>声音</strong>，甚至连细节的声音都被清晰地记录下来。</li>
</ul>

<h4>🔥 现代技巧展示教科书</h4>
<p>作为业界公认的“技巧派”代表，山岸绮花在这部毕业作中毫无保留。</p>
<p>她展示了所谓的<strong>“体位变换之术”</strong>，各种高难度姿势信手拈来。这不仅是一场互动，更像是一场<strong>华丽的舞蹈</strong>。她用这种方式告诉所有人：这就是超一流演员的实力。</p>

<h4>💡 严选点评：再见，绮花！</h4>
<p>虽然引退让人感伤，但好消息是，她并没有完全消失。</p>
<p>据悉，她已经开设了付费粉丝团，未来可能会更多地活跃在网络社群甚至海外活动中。这部作品是她作为“专属演员”的句号，但也可能是她作为“山岸绮花”新篇章的开始。</p>
<p><strong>无论如何，这部充满诚意和回忆的“毕业作”，值得每一位粉丝收藏。</strong></p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #山岸绮花 #YamagishiAyaka #引退作 #毕业 #Premium #精油按摩 #ASMR</p>
<p><strong>📌 番号：</strong> PRED-547<br>
<strong>📅 发行日：</strong> 2026/01/07</p>
    `;
    setArticleTitle(title);
    setArticleContent(preserveImages(articleContent, body));
    toast.success("山岸绮花文案已优化（原图已保留在底部）");
  };


  // Moodyz 三巨头 演示文案填充
  const fillMoodyzDemo = () => {
    const title = "【严选鉴赏】业界的未来靠她们？Moodyz 25周年集结三大顶流共演！";
    const body = `
<p><strong>业界的未来就靠她们三个了！</strong></p>
<p>为了庆祝品牌成立 25 周年，制作商 <strong>Moodyz</strong> 近期共演企划连发。这次他们请来的是私底下交情很好的 <strong>葵伊吹 (葵いぶき)</strong>、<strong>石原希望</strong> 以及 <strong>Unpai (うんぱい)</strong>。</p>
<p>前两者不用多说，堪称业界交情最铁的搭档。妙语连珠的互动加上永远充沛的精力，这对好友不只台前默契十足，在后台更是让人招架不住。至于 Unpai，虽然之前的交集不明显，但既然制作商说她们是好朋友，那这种新鲜的组合化学反应反而更令人期待。</p>

<h4>🎬 为什么说“业界的未来”在她们身上？</h4>
<p>制作商 Moodyz 在文案中给出了极高的评价：“让全日本都热血沸腾的名作”、“业界银河的历史又翻过了一页”。这支作品到底在搞什么名堂？</p>
<p><strong>答案是：街头星探企划 (Audition)。</strong></p>
<p>剧情设定非常有意思：石原希望、葵伊吹以及 Unpai 坐着保姆车在东京巡游，寻找有潜力的素人男性，邀请上车进行“身体检查”，并用她们专业的<strong>演技和互动</strong>来测试对方有没有成为<strong>男演员</strong>的潜质。</p>

<h4>🎭 综艺感拉满：是电影也是脱口秀</h4>
<p>原来，这是在替业界寻找可用之兵啊！难怪被说是肩负未来的作品。</p>
<p>因为任务重要，制作商一口气剪了接近四分钟的宣传影片。看了就知道，<strong>石原希望 + 葵伊吹</strong> 永远都不会无聊，两人默契之好，各种一搭一唱或互相吐槽，就算听不懂日文也能感受到那种欢乐的气氛。</p>
<p>而 <strong>Unpai</strong> 的加入更是神来之笔。她那种稍微慢半拍的独特节奏，夹在两只“精力怪兽”中间意外地有效果。不管是被开玩笑时的呆萌，还是没接住梗时的反应，都充满了综艺效果。看完宣传片后，你会觉得有 Unpai 加入真的太好了。</p>

<h4>💡 严选点评</h4>
<p>当然，除了脱口秀般的搞笑之外，三位女演员对路上发掘来的“新人”进行的测试也是一绝。</p>
<p>前一秒还吱吱喳喳讲个没完，下一秒就展现出极高的专业素养，用全方位的技巧考验对方的能耐。Unpai 的表情和肢体表现力一如既往的出色，而葵伊吹和石原希望的搭配更是展现了深厚的底子。三位顶流的合作绝非玩笑，参与测试的男演员恐怕要面临<strong>前所未有的体力与精神挑战</strong>！</p>
<p>这绝对是一支<strong>既好看又好笑，而且含金量极高</strong>的作品。</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #Moodyz #25周年 #石原希望 #葵伊吹 #Unpai #豪华共演 #街头星探</p>
    `;
    setArticleTitle(title);
    setArticleContent(preserveImages(articleContent, body));
    toast.success("Moodyz 三巨头文案已优化（原图已保留在底部）");
  };

  // 水卜樱 演示文案填充
  const fillMiuraDemo = () => {
    const title = "【严选鉴赏】水卜樱 (Miura Sakura) 误入歧途？Moodyz 全新“惩罚”系列解禁！";
    const body = `
<p><strong>歹路不可行啊！</strong></p>
<p>看到这支作品，你就知道 <strong>水卜樱 (水卜さくら)</strong> 这次拿到了一个“误入歧途”的剧本——她在便利店行窃，被店长 <strong>Tony大木 (トニー大木)</strong> 逮个正着。虽然没有被移送法办，但她面临的却是更深层的“惩罚”。</p>

<h4>🏪 剧情展开：从行窃到服从</h4>
<p>剧情的走向相当大胆：店长不仅留下了因家境贫寒而行窃的水卜樱在店里打工，实际上是将她变成了一个<strong>完全服从的角色</strong>。这种“把柄在手，不得不从”的设定，极大地增加了戏剧张力。</p>
<p>随后的发展更是失控：两人的秘密关系被另一位店员“小谷”察觉。趁着店长不在，他也对水卜樱伸出了“魔掌”。最终，得知此事的店长非但这没有生气，反而兴起了一较高下的念头。于是，一场<strong>三人共演 (3P)</strong> 的激烈戏码上演了，他们甚至要求她评价“谁的演技更好”。</p>

<h4>🔍 系列化预警？Moodyz 的“小只马”策略</h4>
<p>如果你觉得这剧情眼熟，没错，这和之前 <strong>七泽米亚 (七沢みあ)</strong> 的那支作品如出一辙。</p>
<p>Moodyz 似乎有意将“怯懦的行窃少女”这个题材系列化。虽然两人的身材风格不同，但水卜和七泽有个共同点：<strong>极致娇小的身形</strong>。这种“体型差”带来的视觉冲击，或许正是制作商想要呈现的“以大欺小”的压迫感。</p>

<h4>📈 销量证明一切：M社的掌上明珠</h4>
<p>水卜樱马上就展现了她的统治力。作品情报解禁的第一天，她在业界最大平台 FANZA 的实体片通贩排行榜就拿下了<strong>第 2 名</strong>。</p>
<p>要知道，在 Moodyz、Premium、OPPAI 等众多制作商的围剿下，她这支作品能杀出重围，足见其号召力。虽然和刚出道时相比，她的外形风格发生了一些变化（Evolution），但这丝毫没有影响她在粉丝心目中的地位。</p>

<h4>💡 严选点评</h4>
<p>很多人对她的外形变化感到遗憾，但说实话，<strong>她那无可挑剔的顶级身材</strong>才是核心竞争力。无论脸蛋如何变化，水卜樱始终是 Moodyz 的“掌上明珠”，也是业界买气最旺的专属演员之一。</p>
<p>这部作品绝对是剧情紧凑、演技在线，且<strong>视觉冲击力极强</strong>的佳作。</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #水卜樱 #MiuraSakura #Moodyz #Tony大木 #便利店 #小只马 #销量霸榜</p>
    `;
    setArticleTitle(title);
    setArticleContent(preserveImages(articleContent, body));
    toast.success("水卜樱文案已优化（原图已保留在底部）");
  };

  // 三好佑香 演示文案填充
  const fillMiyoshiDemo = () => {
    const title = "【严选鉴赏】Premium的新王牌？三好佑香 (Miyoshi Yuka) 接班山岸绮花的“上位”之路";
    const body = `
<p>这张精致的脸蛋、纤细的腰身、完美的臀部线条——拥有这三大杀器，难怪她是被寄予厚望的 <strong>三好佑香 (三好ゆか)</strong>！</p>

<h4>🏊‍♀️ 剧情张力拉满：热血教师的堕落剧本</h4>
<p>简单介绍一下这支作品的看点：三好佑香饰演的是一位某高中的游泳部指导老师。年轻貌美、身材高挑的她，不仅是学生心目中的女神，更是一位充满正义感的好老师。当发现社团内存在霸凌行为时，她毫不犹豫地挺身而出保护受害者，却也因此招致了霸凌者（由“童帝”结城结弦饰演）的疯狂报复。</p>
<p><strong>剧情的转折点在于那个“泳池之夜”。</strong></p>
<p>原本是保护者的她，在对方的阴谋下（药物作用）失去了行动能力。而在她最想保护的学生面前，她被迫展现出了脆弱的一面。接下来发生的事情充满了戏剧张力：只要换上那件连身泳装，她就成了待宰的羔羊。</p>

<h4>🎭 演技爆发：从守护者到被支配者</h4>
<p>在长时间的<strong>激烈互动</strong>戏份中，三好佑香展现了惊人的爆发力。她将那种羞耻、绝望却又无法抗拒身体本能的复杂情绪，演绎得淋漓尽致。</p>
<p>特别是当原本的受害者（学生）也因心理防线崩溃，从“受害者”摇身一变成为“加害者”，对她伸出咸猪手时，她眼神中的那一抹绝望，绝对是教科书级别的演技。不得不说，结城结弦这次的反派演技太出色了，侧面衬托出了三好佑香的“悲剧美”。</p>

<h4>💡 严选点评：Premium 的下一位“看板娘”？</h4>
<p>在这部作品之外，有一个更值得关注的行业信号：<strong>三好佑香极有可能成为制作商 Premium 未来的绝对王牌。</strong></p>
<p>判断依据主要有两点：</p>
<ul>
<li><strong>一姐交接</strong>：随着当家花旦 <strong>山岸绮花 (山岸あや花)</strong> 宣布将于明年 1 月发布“毕业作”，Premium 急需一位能扛大旗的接班人。</li>
<li><strong>官方盖章</strong>：在前不久举办的业界忘年会上，三好佑香直接拿下了<strong>“Premium 赏”</strong>。这几乎就是官方的“册封大典”，直接把品牌名字作为奖项颁给她，重视程度可见一斑。</li>
</ul>
<p>虽然资历尚浅，但曾有过丰富拍摄经验的她，无论是外形条件还是敬业程度，都完全配得上这个位置。在山岸绮花离开后的空窗期，三好佑香无疑是最好的继任者。</p>
<p><strong>祝福她！希望未来能有更多精彩的作品，甚至在海外活动中见到她的身影。</strong></p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #三好佑香 #MiyoshiYuka #Premium #接班人 #游泳部 #女教师 #剧情向</p>
    `;
    setArticleTitle(title);
    setArticleContent(preserveImages(articleContent, body));
    toast.success("三好佑香文案已优化（原图已保留在底部）");
  };

  // 七瀬栞 演示文案填充
  const fillNanaseDemo = () => {
    const title = "【严选情报】文武双全的名校生？七瀬栞 (Nanase Shiori) 的“双面”人生与流出真相";
    const body = `
<p>这是个文武双全的新人！</p>
<p>她叫 <strong>七瀬栞 (七瀬しおり)</strong>，目前还是一名在读的名校大学生。之所以说她文武双全，是因为她在音乐和竞技游泳这两个动静皆宜的领域都表现出色。然而，在父母高压的精英教育下，她选择了最叛逆的方式来宣泄压力——投身业界。</p>

<h4>🏊‍♀️ 游泳选手的顶级曲线</h4>
<p>虽然不是通常意义上的“巨乳系”新人，但七瀬栞的身体素质极佳。常年游泳训练赋予了她<strong>极其紧致的肌肉线条</strong>，特别是背部和腰臀的曲线，堪称艺术品。</p>
<p>在摄影棚里，她展现出的不仅仅是好身材，更有惊人的<strong>“敏感度”</strong>。制作商 Moodyz 甚至在出道作中安排了高强度的<strong>多人共演</strong>桥段，而她应对自如，那种从压抑到彻底释放的反差感，极具看点。</p>

<h4>🔍 为什么是 Moodyz FRESH？</h4>
<p>冷静分析一下，虽然她在片中的“千金大小姐”造型非常有气质，但面部轮廓（特别是下巴）可能不是每个人都能接受的类型。Moodyz 将她放在主打“新鲜感”的 FRESH 系列出道，或许也是看准了她<strong>“适合突袭，不适合长线”</strong>的特质。</p>

<h4>🕵️‍♀️ 挖掘历史：FC2 时期的“原石”</h4>
<p>这篇文章的重点来了：早在 2026 年正式出道前，她其实在 2022 年就已经活跃在 FC2 平台了。</p>
<p><strong>相关神秘代码：</strong> FC2-PPV-3139843 / 3153387 / 3169857</p>
<p>那时候的她虽然牙齿还没矫正，略显青涩，但身体条件已经非常出色。相比于制作商精修后的画面，FC2 这种<strong>“无修饰的真实感”</strong>反而更能体现她的优势。对于喜欢<strong>“探究真相”</strong>的绅士来说，这些早期的流出作品能让你看到她最真实、最毫无保留的一面（尤其是下半身的细节）。</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #七瀬栞 #NanaseShiori #Moodyz #名校生 #游泳部 #FC2流出 #黑历史</p>
    `;
    setArticleTitle(title);
    setArticleContent(preserveImages(articleContent, body));
    toast.success("七瀬栞文案已优化（原图已保留在底部）");
  };

  // 早濑蓳 演示文案填充
  const fillHayaseDemo = () => {
    const title = "【业界观察】(DEAB-006) 钢琴天才早濑蓳夺冠？Fitch 的“AI造星”与真身猜想";
    const body = `
<p>你有发现吗？昨天，制作商 <strong>Fitch</strong> 发行的作品「世界瞩目的美丽天才钢琴家 早濑蓳 (早瀬すみれ) 业界出道」一举拿下了 <strong>FANZA (DMM)</strong> 实体片通贩排行榜的单日销售冠军。</p>
<p>为什么一个新人能有如此大的爆发力？</p>

<h4>🎹 完美人设：从琴键到指尖的艺术</h4>
<p>不得不说，Fitch 这次的人设做得太好了。<strong>早濑蓳 (早瀬すみれ)</strong>，25 岁，从小苦练钢琴，顶着“天才”的光环，甚至在国际大赛中夺得过铜牌。</p>
<p>文案更是充满诗意：她决定将演奏的对象从黑白琴键变成“人”，用她那双灵巧的手指去探索情感的共鸣，追寻快乐的真谛。配合那张气质出众的封面，确实让人充满了无限遐想。</p>

<h4>🤖 真相揭秘：Fitch 的“AI 魔法”</h4>
<p>可能有人会怀疑：这种级别的钢琴家真的会来拍影像作品吗？甚至已经有人开始用以图搜图寻找她的真实身份了。</p>
<p>但在你行动之前，请注意这支作品的番号系列——<strong>DEAB</strong>。这是 Fitch 旗下的“电子美女 (Deep)”制作小组发行的。文案末尾也诚实地标注了：<strong>“为了保护本人隐私，脸部经过了 AI 微调。”</strong></p>
<p><strong>没错，这是一支运用了 AI 换脸技术的作品。</strong></p>
<p>虽然这听起来有点“劝退”，但从销量来看，Fitch 赌赢了。早濑蓳的这张脸，经过 AI 调整后，不仅保留了真实感，更增添了一种近乎完美的艺术气质。虽然目前的技术偶尔会有表情僵硬的小瑕疵，但整体的视觉享受绝对是顶级的。</p>

<h4>🔍 侦探时间：AI 脸下的真身是谁？</h4>
<p>既然脸是 AI 的，那身体总归是真的吧？</p>
<p>让我们来看看她的硬件条件：<strong>身高 171cm</strong>，C 罩杯。虽然不是爆乳，但这种模特级别的修长身材，配合钢琴家的气质，反而更具高级感。</p>
<p><strong>我的推测是：</strong> 这位“中之人”极有可能是 Faleno Star 的专属演员——<strong>森彩美 (森あやみ)</strong>。</p>
<p><strong>证据链：</strong></p>
<ul>
<li><strong>身形吻合</strong>：业界身高超过 170cm 且是 C 罩杯的女演员屈指可数，森彩美的体型与片中人高度一致。</li>
<li><strong>技能匹配</strong>：查阅维基百科，森彩美的特技一栏赫然写着<strong>“钢琴”</strong>。</li>
</ul>
<p>Fitch 找一位真的会弹钢琴的高挑美女来出演，再配上 AI 生成的完美脸蛋，这波操作可以说是“虚实结合”的典范了。如果你是<strong>长腿控</strong>或者<strong>森彩美</strong>的粉丝，这部作品绝对值得一探究竟。</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #早濑蓳 #HayaseSumire #Fitch #AI换脸 #森彩美 #钢琴家 #销量冠军</p>
<p><strong>📌 番号：</strong> DEAB-006<br>
<strong>📅 发行日：</strong> 2026/01/09</p>
    `;
    setArticleTitle(title);
    setArticleContent(preserveImages(articleContent, body));
    toast.success("早濑蓳文案已优化（原图已保留在底部）");
  };

  // 吉泽梨亚 演示文案填充
  const fillYoshizawaDemo = () => {
    const title = "【突发情报】宣传大使“人间蒸发”？Faleno Star 吉泽梨亚 (Yoshizawa Ria) 消失之谜";
    const body = `
<p>真的是天有不测风云。</p>
<p>业界最残酷的地方就在于它的“不确定性”。前一秒可能还在聚光灯下接受欢呼，下一秒就可能毫无预兆地消失。这次让我们措手不及的主角，是 <strong>Faleno Star</strong> 的专属演员——<strong>吉泽梨亚 (吉沢梨亜)</strong>。</p>

<h4>📉 消失得太彻底了！</h4>
<p>这次的“消失”不是那种暂时的休养或停更，而是最决绝的那种：</p>
<ul>
<li><strong>社群全灭</strong>：X (Twitter) 和 Instagram 账号全部注销，粉丝甚至来不及道别。</li>
<li><strong>官网除名</strong>：事务所 LINX 的官方网站上，已经找不到她的任何资料。</li>
</ul>
<p>这意味着她已经完全脱离了事务所的掌控。对于一位在大型制作商担任专属的艺人来说，这种情况非常罕见且棘手。</p>

<h4>🤔 为什么说这次“很反常”？</h4>
<p>如果是一个边缘艺人消失也就罢了，但吉泽梨亚的身份很特殊。她是 <strong>Faleno 集团的宣传大使</strong>。</p>
<p>大家都知道，Faleno 最近正在举办盛大的“大感谢祭”见面会活动，而吉泽梨亚在其中扮演着吃重的角色（甚至还在 10 月份担任了一日店长）。制作商不是傻子，敢把这么重要的宣传任务交给她，说明她在当时是<strong>人气稳定、配合度高且深受信任</strong>的。</p>
<p>但偏偏不出意外的话就出意外了。这种“宣传期中途跑路”的行为，不仅打了制作商的脸，更让经纪公司 LINX 陷入了巨大的公关危机。</p>

<h4>🕵️‍♀️ 消失原因猜想：冲突还是被挖角？</h4>
<p>虽然目前没有确切消息，但从业界的历史经验来看，吉泽梨亚这种“毁灭式退圈”的可能性主要有两种：</p>
<ol>
<li><strong>激烈的内部冲突</strong>：与经纪公司或制作商发生了无法调和的矛盾，导致她选择“掀桌子”走人。</li>
<li><strong>不可抗力的私事</strong>：可能涉及感情问题、家庭原因，或者是被更有诱惑力的条件“拐跑”了（虽然这种概率较低）。</li>
</ol>
<p>无论哪种原因，对于 LINX 事务所来说都是一记重创。毕竟在大型制作商拥有专属合约的艺人是公司的摇钱树，失去一个吉泽梨亚造成的战力缺口，可能用三个普通新人也填补不回来。</p>

<h4>💡 严选点评：且看且珍惜</h4>
<p>吉泽梨亚的消失再次提醒我们：<strong>在这个行业，没有什么是永恒的。</strong></p>
<p>如果你硬盘里还存着她的作品，请好好珍惜。虽然未来她回归的可能性微乎其微，但她曾经留下的那些精彩瞬间，依然值得我们回味。对于事务所 LINX，我们也只能说一句：施主保重。</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #吉泽梨亚 #YoshizawaRia #FalenoStar #突发引退 #人间蒸发 #LINX #宣传大使</p>
    `;
    setArticleTitle(title);
    setArticleContent(preserveImages(articleContent, body));
    toast.success("吉泽梨亚文案已优化（原图已保留在底部）");
  };

  // 八木奈奈 演示文案填充
  const fillYagiDemo = () => {
    const title = "【独家专访】不看漫画不打游戏？“文学美少女”八木奈奈 (Yagi Nana) 的反差萌生活";
    const body = `
<p>2025 年的最后一场摄影会，我们请来了一位非常特别的嘉宾。</p>
<p>她就是 <strong>八木奈奈 (八木奈々)</strong>。虽然这是我们的首次正式合作，但经过一整天的相处，我发现她真的和业界 99% 的艺人都不一样。</p>

<h4>📚 娱乐圈的“异类”？</h4>
<p>在拍摄间隙，我习惯性地会问艺人一些轻松的话题，比如喜欢什么漫画、最近在玩什么手游、喜欢听谁的歌。但八木奈奈的回答让我大跌眼镜：</p>
<ul>
<li><strong>不看漫画，不打手游</strong>：这在年轻艺人中简直是稀有动物，导致我一度找不到切入点。</li>
<li><strong>对流行音乐不感冒</strong>：无论是 J-POP 还是 K-POP，她都表示“不熟”，现场放什么背景音乐她都无所谓。</li>
</ul>
<p><strong>那她到底喜欢什么？答案是：看书。</strong></p>
<p>这次来参加活动，她的随身包里竟然装了好几本书！只要是休息时间，她就会静静地坐在一旁阅读。她还告诉我，如果有空闲时间，她最想去的地方是<strong>博物馆</strong>和<strong>美术馆</strong>。</p>

<h4>👓 真正的“文学美少女”</h4>
<p>以前我们总说“人设”，但在八木奈奈身上，<strong>“文学美少女”</strong>绝对不是人设，而是她的本色。</p>
<p>私底下的她，戴着一副银边圆框眼镜，那种由内而外散发出的知性气质，比任何剧本里的扮演都要真实动人。就算不说话，光是静静地看着她翻书的样子，都是一种享受。</p>

<h4>⚡️ 效率惊人的“仙女”</h4>
<p>除了气质独特，八木奈奈的工作态度也让我印象深刻。</p>
<p>因为有着<strong>早睡早起</strong>的好习惯，她在工作时精力非常集中，完全不拖泥带水。拍摄素材的速度创下了我有史以来的最快纪录！对于需要赶场的摄影师和粉丝来说，这种既配合又高效的艺人，简直就是仙女下凡。</p>

<p><strong>💡 总结：</strong> 如果你喜欢知性、安静、有内涵的女生，八木奈奈绝对是你的不二之选。2025 年的压轴活动，有她真好。</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #八木奈奈 #YagiNana #独家专访 #文学少女 #眼镜娘 #气质女神 #反差萌</p>
    `;
    setArticleTitle(title);
    setArticleContent(preserveImages(articleContent, body));
    toast.success("八木奈奈文案已优化（原图已保留在底部）");
  };

  // 凑音可怜 演示文案填充
  const fillMinatoDemo = () => {
    const title = "【严选鉴赏】不是女主播？Premium 推出“高端护士”凑音可怜 (Minato Karen) G杯出道！";
    const body = `
<p>这次不是女主播！</p>
<p>就像幻影旅团偶尔也会做慈善一样，一向主打“女主播”人设的制作商 <strong>Premium</strong>，在 2026 年 1 月偶尔也会换换口味。这次登场的专属新人——<strong>凑音可怜 (湊音かれん)</strong>，身穿白衣、挂着听诊器，身份一目了然：前高端诊所护士。</p>

<h4>💉 精英人设：从高端诊所到业界舞台</h4>
<p>不同于普通的小诊所，设定中她服务于<strong>知名高端诊所</strong>。这意味着她日常接触的都是一流企业老板、外资高管甚至演艺圈名人。因此，她不仅拥有专业的护理技能，英文流利，甚至能和客户从外太空聊到内子宫，是真正的“知性派”。</p>
<p>但正如所有精彩的故事一样，反差才是魅力的源泉。在专业冷艳的外表下，她内心深处渴望着<strong>释放与冒险</strong>，这正是她选择投身业界的动力。</p>

<h4>🔥 姐姐系的战斗力：全糖笑容 + G杯冲击</h4>
<p>Premium 向来主打成熟、优雅的“姐姐系”风格，这里的女演员没有太多青涩害羞的空间，必须“即战力”拉满。</p>
<p>24 岁的凑音可怜完全符合这个标准：</p>
<ul>
<li><strong>主动出击</strong>：她没有新人的扭捏，而是带着“全糖笑容”主动掌控节奏，展现出极高的配合度和热情。</li>
<li><strong>G杯巨乳</strong>：虽然资料上的 G 罩杯可能有水分，但视觉上的<strong>波涛汹涌</strong>是实打实的。特别是在骑乘位等动作中，那种“乳摇知马力”的视觉冲击力，绝对能满足巨乳控的需求。</li>
<li><strong>绝技加持</strong>：文案重点宣传了她的<strong>“水量惊人”</strong>，甚至夸张到“担心她脱水”的程度。虽然宣传片可能有所保留，但这无疑是正片的一大看点。</li>
</ul>

<h4>💄 颜值避雷针：发型是关键</h4>
<p>关于颜值，必须客观说两句。封面图利用角度修饰了脸型，实际上凑音可怜的脸蛋属于<strong>圆润成熟型</strong>。</p>
<p>但这并不意味着她是“封面杀手”。她的美很大程度上取决于发型：<strong>头发放下来</strong>时显得温婉动人，一旦绑起来可能会略显成熟（老气）。所以，她在片中的造型变化值得关注。</p>

<h4>💡 严选点评：Premium 的正统血脉</h4>
<p>出道作番号是 <strong>PRED</strong> 而非 PRST，证明她是 Premium 的<strong>正统专属女优</strong>。虽然有新人光环加持，但理性来看，她的综合条件相比同社的 <strong>三好佑香</strong> 和 <strong>和香夏树</strong> 可能稍逊一筹。</p>
<p>不过，如果你喜欢<strong>护士题材</strong>、<strong>巨乳姐姐</strong>或者<strong>“高水量”</strong>演出，这位“高端护士”依然值得一试。</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #凑音可怜 #MinatoKaren #Premium #护士 #G罩杯 #潮吹 #成熟姐姐</p>
    `;
    setArticleTitle(title);
    setArticleContent(preserveImages(articleContent, body));
    toast.success("凑音可怜文案已优化（原图已保留在底部）");
  };

  // 东云椿 演示文案填充
  const fillShinonomeDemo = () => {
    const title = "【严选鉴赏】超模凯旋归来？E-Body 新人东云椿 (Shinonome Tsubaki) 的“假面”与“真心”";
    const body = `
<p>好强大的封面气场啊！</p>
<p>这是制作商 <strong>E-Body</strong> 即将在明年 1 月推出的重磅新人——<strong>东云椿 (东云つばき)</strong>。虽然出道于主打熟龄魅力的“花团锦簇 (花ざかり)”系列，但那对一手无法掌握的<strong>傲人上围</strong>和极具反差的<strong>纤细腰身</strong>，绝对能第一时间抓住你的眼球。</p>

<h4>👠 超模人设：是噱头还是实力？</h4>
<p>封面文案非常高调：这是一位曾在海外走过伸展台的<strong>专业模特儿</strong>，如今算是“凯旋归来”。</p>
<p>也许是因为这份履历太过耀眼，制作商甚至省略了常见的“人妻”背景设定，直接将焦点对准了她<strong>大胆奔放</strong>的一面。剧照中的她，确实自带一种久经沙场的自信气场，完全没有新人的青涩感。</p>

<h4>🔥 演技爆发：主动出击的肉食系</h4>
<p>既然人设是“见过大世面”的模特，那么演出风格自然不能扭扭捏捏。</p>
<p>在片中，东云椿展现了极强的<strong>攻击性</strong>：</p>
<ul>
<li><strong>主动权争夺</strong>：她不仅主动引导对手，甚至在激烈的短兵相接中试图抢夺主导权。</li>
<li><strong>高敏感体质</strong>：反应极其灵敏，简单的技巧就能让她展现出<strong>“水姑娘”</strong>般炸裂的视觉效果。</li>
<li><strong>多人混战</strong>：面对多人包夹的场面，她依然游刃有余，那种享受被征服的表情管理堪称一绝。</li>
</ul>

<h4>💄 颜值避雷针：真实状况如何？</h4>
<p>到了大家最关心的环节：是不是封面杀手？</p>
<p><strong>结论是：很意外地没有翻车。</strong> 她的脸蛋和封面差异不大，确实有一张很有辨识度的“模特脸”，属于那种让人过目不忘的类型。</p>
<p>但 E-Body 的作品向来高清且不留情面，我们也必须诚实指出：</p>
<ol>
<li><strong>科技感</strong>：那对傲人的上围，在动态画面中能看出明显的“人工痕迹”（假奶）。</li>
<li><strong>熟龄感</strong>：肤况和细节确实暴露了一些岁月的痕迹，这也解释了为什么她会选择在熟女系列出道。</li>
</ol>
<p><strong>但这并不影响观感。</strong> 正是因为有了岁月的沉淀，她才能驾驭这种疯狂而投入的演出风格。用演技来弥补硬件的微瑕，这正是成熟演员的魅力所在。</p>

<h4>💡 严选点评</h4>
<p>虽然有人工痕迹，但东云椿绝对算得上是近期 E-Body 推出的<strong>大型新人</strong>。如果你喜欢<strong>模特身材</strong>、<strong>主动系姐姐</strong>或者对<strong>“科技身材”</strong>不排斥，这部作品绝对值得一试。</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #东云椿 #ShinonomeTsubaki #EBody #超模 #假奶 #熟女 #肉食系</p>
    `;
    setArticleTitle(title);
    setArticleContent(preserveImages(articleContent, body));
    toast.success("东云椿文案已优化（原图已保留在底部）");
  };

  // 幸村泉希 演示文案填充
  const fillYukimuraDemo = () => {
    const title = "【业界观察】Moodyz 弃将？幸村泉希 (Yukimura Mizuki) 光速移籍本中“解禁”背后的商业逻辑";
    const body = `
<p><strong>这也太快了吧？</strong></p>
<p>为什么说“快”？这就要从 <strong>幸村泉希 (幸村泉希)</strong> 这位演员讲起。可能有些朋友对她还不太熟悉，这很正常，因为她今年 9 月才刚刚在顶级制作商 <strong>Moodyz</strong> 以专属身份出道，当时的人设是“漂亮的电梯小姐”。</p>

<h4>📉 专属合约的终结：光速“毕业”</h4>
<p>这支新作品的出现释放了几个关键信号：</p>
<ol>
<li><strong>M社合作结束</strong>：Moodyz 和 S1 一样，除非特别注明外借，否则一旦演员去其他厂牌发片，通常意味着原专属合约已终结。</li>
<li><strong>自由身疑云</strong>：这支由制作商“本中”发行的作品，从封面到文案都没有注明“专属”字样，这意味着幸村泉希可能已经成为自由身（Kikutan）。</li>
</ol>
<p>起点很高，但仅仅三个月就离开，这在业界确实让人意外。相形之下，所谓的“解禁”反而显得微不足道了。</p>

<h4>🎬 妄想成真：本中的“解禁”剧本</h4>
<p>那么，“本中”是用什么方式让她解禁的呢？答案是：<strong>将妄想变为现实的戏剧片。</strong></p>
<p>这次的剧本设计非常有意思，通过“剧中剧”的形式，还原了幸村泉希脑海中的两个“妄想”：</p>
<ul>
<li><strong>便利店惊魂</strong>：作为店员阻止粗鲁顾客却遭报复，在深夜柜台被迫进行多人互动。</li>
<li><strong>赌债肉偿</strong>：为了帮助重要的人还债，甘愿用身体去清偿，在牺牲中寻找快乐。</li>
</ul>
<p>不得不说，如果这真是她本人的脑洞，那这位外表高冷的电梯小姐内心其实相当“有趣”。</p>

<h4>🔍 深度分析：为什么是三个月？</h4>
<p>最后来聊聊大家最关心的问题：<strong>为什么 Moodyz 这么快就放人了？是因为她表现不好吗？</strong></p>
<p><strong>我的观点是：非也。</strong></p>
<p>业界通常的制作周期是 6 个月。幸村泉希仅仅发了 3 支作品就离开，这说明她一开始签的就是<strong>“短期专属合约”</strong>（俗称 3 片限定）。换句话说，她在正式出道前，其实就已经注定要离开 Moodyz 去本中发展了。</p>
<p>这并不是她表现不好，而是业界残酷的商业选择。即使条件再优秀，在这个竞争激烈的圈子里，有时候也只能接受“短打”的命运。</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #幸村泉希 #YukimuraMizuki #本中 #解禁 #移籍 #妄想具现化 #业界观察</p>
    `;
    setArticleTitle(title);
    setArticleContent(preserveImages(articleContent, body));
    toast.success("幸村泉希文案已优化（原图已保留在底部）");
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

  // --- 演示文案配置 ---
  const demoTemplates = [
    { id: 'mai', label: '🎀 七嶋舞', action: fillMaiDemo, style: 'border-pink-300 text-pink-600 hover:bg-pink-50' },
    { id: 'marina', label: '🍈 役野满里奈', action: fillMarinaDemo, style: 'border-lime-200 text-lime-600 hover:bg-lime-50' },
    { id: 'ayaka', label: '🎓 山岸绮花', action: fillAyakaDemo, style: 'border-slate-200 text-slate-600 hover:bg-slate-50' },
    { id: 'moodyz', label: '🎥 Moodyz三巨头', action: fillMoodyzDemo, style: 'border-red-200 text-red-600 hover:bg-red-50' },
    { id: 'miura', label: '🍒 水卜樱', action: fillMiuraDemo, style: 'border-pink-400 text-pink-700 hover:bg-pink-100' },
    { id: 'miyoshi', label: '🏊‍♀️ 三好佑香', action: fillMiyoshiDemo, style: 'border-cyan-200 text-cyan-600 hover:bg-cyan-50' },
    { id: 'nanase', label: '🎓 七瀬栞', action: fillNanaseDemo, style: 'border-indigo-200 text-indigo-600 hover:bg-indigo-50' },
    { id: 'hayase', label: '🎹 早濑蓳', action: fillHayaseDemo, style: 'border-violet-200 text-violet-600 hover:bg-violet-50' },
    { id: 'yoshizawa', label: '🏃‍♀️ 吉泽梨亚', action: fillYoshizawaDemo, style: 'border-rose-200 text-rose-600 hover:bg-rose-50' },
    { id: 'yagi', label: '👓 八木奈奈', action: fillYagiDemo, style: 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' },
    { id: 'minato', label: '💉 凑音可怜', action: fillMinatoDemo, style: 'border-sky-200 text-sky-600 hover:bg-sky-50' },
    { id: 'shinonome', label: '👠 东云椿', action: fillShinonomeDemo, style: 'border-fuchsia-200 text-fuchsia-600 hover:bg-fuchsia-50' },
    { id: 'yukimura', label: '🏙️ 幸村泉希', action: fillYukimuraDemo, style: 'border-teal-200 text-teal-600 hover:bg-teal-50' },
    { id: 'kawakita', label: '💇‍♀️ 河北彩伽', action: fillKawakitaDemo, style: 'border-orange-200 text-orange-600 hover:bg-orange-50' },
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
