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

  // 枫花恋演示文案填充
  const fillKarenDemo = () => {
    setArticleTitle("【严选鉴赏】枫花恋 (Kaede Karen) 封神回归：120分钟一镜到底，是噱头还是演技巅峰？");
    setArticleContent(`
<p>如果在业界要列一份“最让人意难平”的休业名单，<strong>枫花恋 (Kaede Karen)</strong> 的名字绝对在前三之列。</p>
<p>作为“严选资源站”的站长，我阅片无数，但听到她回归的消息时，心里还是咯噔了一下。毕竟，“回归作”往往容易陷入两个极端：要么是敷衍了事的圈钱之作，要么是用力过猛的转型尝试。</p>
<p>但这次，枫花恋交出了一份几乎满分的答卷。<strong>她没有选择保守的常规剧本，而是直接挑战了业界最高难度的——120分钟一镜到底（One Cut）。</strong></p>

<h4>🎬 为什么说“120分钟长镜头”是疯了？</h4>
<p>大家看片都知道，通常一部作品是由无数个镜头剪辑而成的。演员累了可以停，状态不好可以重来。</p>
<p>但<strong>“一镜到底”意味着什么？</strong><br>这意味着整整两个小时，摄像机从不开机那一刻起就不能关。这不仅是对体力的魔鬼考验，更是对演员表情管理、情绪调动以及现场应变能力的极限挑战。只要中间有一秒钟的穿帮或尴尬，整段素材就废了。</p>
<p>敢接这种企划，说明枫花恋这次是<strong>带着“野心”回来的</strong>。</p>

<h4>👁️ 视觉冲击：不仅仅是时间的堆砌</h4>
<p>很多打着“长镜头”旗号的作品，往往会让人觉得枯燥乏味。但这部新作的聪明之处在于节奏的把控。</p>
<ul>
<li><strong>前30分钟</strong>：她展现了久违的细腻演技，那种即使在长镜头下也毫无死角的颜值，让人不得不感叹：神颜依旧。</li>
<li><strong>中段爆发</strong>：没有任何剪辑的修饰，汗水、喘息、皮肤的纹理，所有的反应都是最真实的生理反馈。这种<strong>“在场感”</strong>是普通作品无法比拟的。</li>
<li><strong>结尾余韵</strong>：当倒计时结束的那一刻，你能通过屏幕感受到那种真实的力竭与释然。</li>
</ul>

<h4>💡 严选点评</h4>
<p>对于<strong>LSP</strong>们来说，这部作品的收藏价值极高。它不再是快餐式的消耗品，而是一部值得你泡上一杯茶，戴上耳机，细细品味的“纪录片”。</p>
<p>枫花恋用这部作品证明了：<strong>她依然是那个站在金字塔尖的顶级女优。</strong></p>
<p>如果你厌倦了千篇一律的剪辑和表演，这部挑战极限的回归之作，绝对能唤醒你沉睡已久的视觉神经。</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #枫花恋 #KaedeKaren #回归新作 #长镜头 #严选资源</p>
    `);
    toast.success("文案已填充，请上传封面图后保存！");
  };

  // SOD 演示文案填充
  const fillSodDemo = () => {
    setArticleTitle("【业界观察】SOD Star 断层危机？一宫留衣 x 天神羽衣“同期共演”背后的真相");
    setArticleContent(`
<p>最近业界有个很有意思的现象：Will集团（S1、Moodyz等）搞共演不稀奇，但向来特立独行的 <strong>SOD集团</strong> 这次也坐不住了。</p>
<p>这次他们打出了一张“同期共演”的牌，主角是今年刚出道的两位超级新人：<strong>一宫留衣 (一宮るい)</strong> 和 <strong>天神羽衣</strong>。</p>

<h4>🤔 为什么说这次共演很“反常”？</h4>
<p>懂行的朋友都知道，通常片商不会让两个刚出道不到半年的新人（所谓“菜鸟”）直接搞共演。这种资源一般是留给有一定粉丝基础的中坚力量的。</p>
<p>但 SOD Star 这次的操作，其实暴露了一个尴尬的现状：<strong>新生代断层。</strong></p>
<ul>
<li><strong>老牌天后</strong>：神木丽、星乃莉子这些“四小天后”都已经出道3年以上，该拍的题材都拍烂了，观众确实有点审美疲劳。</li>
<li><strong>中生代隐身</strong>：出道两年的渚恋生等人至今没有共演，条件不错的彩月七绪又被放养。</li>
</ul>
<p>所以，与其说是“大胆启用新人”，不如说是 SOD <strong>被迫提前打出了这两张王牌</strong>。</p>

<h4>🎬 1日SOD女子社员：熟悉的配方，新鲜的味道</h4>
<p>虽然背景分析有点沉重，但回归作品本身，这次的企划还是挺有看点的。</p>
<p>SOD 拿出了看家本领——<strong>“1日女子社员”企划</strong>。两位新人换上职场制服，体验普通社员的日常工作（开会、备料）。而既然是 SOD，肯定少不了那标志性的<strong>“隐形人（黑子）”</strong>设定。</p>
<p><strong>看点提炼：</strong></p>
<ol>
<li><strong>反差萌</strong>：看着两位一本正经地在开会做笔记，旁边却有一堆蒙面男优在疯狂骚扰，这种强烈的“职场禁忌感”拉满。</li>
<li><strong>忍耐力大挑战</strong>：天神羽衣的表现尤为亮眼，一边还在认真记录会议纪要，一边却因为受到攻击而身体颤抖，这种<strong>“想要维持专业形象却又控制不住生理反应”</strong>的演技，确实比单纯的叫床更有张力。</li>
</ol>

<h4>💡 严选点评</h4>
<p>虽然我觉得这支作品少了点当年守屋芳乃那次共演的“蕾丝边”化学反应，气势上稍微弱了一些，但这不能怪女优。</p>
<p><strong>一宫留衣的清纯</strong>加上<strong>天神羽衣的灵动</strong>，这对组合本身是非常养眼的。如果你喜欢 <strong>OL制服</strong>、<strong>职场凌辱</strong> 或者 <strong>羞耻Play</strong>，这部由两位顶级新人带来的“被迫营业”大戏，依然是近期不可多得的佳作。</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #SOD #一宫留衣 #天神羽衣 #共演 #职场制服 #严选观察</p>
    `);
    toast.success("SOD文案已填充，请上传封面图后保存！");
  };

  // 爱才莉亚 演示文案填充
  const fillAiseDemo = () => {
    setArticleTitle("【严选鉴赏】(IPZZ-761) 出道一周年惨遭“下药”？爱才莉亚 (Aise Ria) 温泉旅行の真实记录");
    setArticleContent(`
<p>时间过得真快，转眼间 <strong>爱才莉亚 (愛才りあ)</strong> 已经出道一周年了。</p>
<p>为了庆祝这个重要的里程碑，片商 Ideapocket (IP社) 特地为她安排了一场看似温馨的“温泉旅行”。比起隔壁棚濑户环奈那种和15位粉丝一起泡澡的“感谢祭”，爱才莉亚这次的待遇可谓是“冰火两重天”。</p>

<h4>♨️ 温泉企划的背后：是惊喜还是惊吓？</h4>
<p>表面上，这是片商为了奖励她一年来的辛勤工作，特意安排的放松之旅。但熟悉 IP社 尿性的老司机都知道，事情绝对没有这么简单。</p>
<p><strong>这是一场精心策划的“狩猎”：</strong></p>
<ul>
<li><strong>第一步：卸下防备</strong>。舒适的温泉酒店，轻松的访谈氛围，让她完全放松警惕。</li>
<li><strong>第二步：循序渐进</strong>。喝的热茶、按摩用的精油，都被“加了料”。</li>
<li><strong>第三步：彻底崩坏</strong>。当她发现身体开始不受控制地燥热时，一切都已经晚了。</li>
</ul>

<h4>👁️ 演技还是真实反应？</h4>
<p>这支作品最大的看点就在于<strong>“反差”</strong>。前一秒还是那个高挑、清纯、拥有 E 罩杯完美身材的“正统派偶像”，后一秒就在药物的作用下变成了只知道索取的“肉欲野兽”。</p>
<p>虽然大家都知道这是剧本（毕竟在日本这是犯法的），但爱才莉亚的演技确实让人信服。那种<strong>从困惑、挣扎到最后彻底放弃理智、顺从欲望</strong>的过程，演绎得淋漓尽致。这种“被动堕落”的戏码，往往比主动出击更让人血脉喷张。</p>

<h4>💡 严选点评：IP社的未来王牌</h4>
<p>在桃乃木引退、明里紬移籍之后，IP社急需新的顶梁柱。而 <strong>爱才莉亚</strong> 无疑是目前的最佳人选之一。</p>
<p>虽然她的社交媒体粉丝数还不够多，海外知名度也还有待拓展，但论外形条件和敬业程度，她绝对是妥妥的“次世代王牌”。这部一周年纪念作，更像是片商给她的一次“成人礼”，宣告她已经准备好迎接更大尺度的挑战了。</p>

<p>如果你喜欢<strong>高挑美腿</strong>、<strong>温泉Play</strong>以及<strong>带有轻微强制色彩</strong>的剧情，这部作品绝对不容错过。</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #爱才莉亚 #AiseRia #IP社 #出道一周年 #温泉 #严选鉴赏</p>
<p><strong>📌 番号：</strong> IPZZ-761<br>
<strong>📅 发行日：</strong> 2026/01/13</p>
    `);
    toast.success("爱才莉亚文案已填充，请上传封面图后保存！");
  };

  // 青坂葵 演示文案填充
  const fillAoiDemo = () => {
    setArticleTitle("【新人鉴赏】(CAWD-918) Kawaii* 捡到宝？号称“一亿分之一”的美少女青坂葵，到底什么来头？");
    setArticleContent(`
<p>在业界，有些新人虽然没在 S1、Moodyz 这种顶级片商出道，但她们的素质却足以让所有人大吃一惊。</p>
<p>今天要介绍的这位来自 <strong>Kawaii* (可爱社)</strong> 的超级新人——<strong>青坂葵 (青坂あおい)</strong>，绝对是 2026 年初最不容忽视的一匹黑马。</p>

<h4>💎 真的有“一亿分之一”那么夸张吗？</h4>
<p>片商给出的文案极其嚣张：“日本国民中最害羞、最质朴也最色情的 20 岁女大学生，一亿人里才出一个”。</p>
<p>起初我以为又是常见的“封面欺诈”，但看完正片后，我沉默了。<strong>她真的有这个资本。</strong></p>
<ul>
<li><strong>颜值</strong>：清秀的脸庞，甜美的笑容，标准的“初恋脸”。</li>
<li><strong>身材</strong>：E 罩杯的完美上围，丰满圆润，搭配纤细的腰身和<strong>无毛的下半身</strong>（白虎党狂喜！），简直就是为了镜头而生的肉体。</li>
<li><strong>造型</strong>：无论是学生服还是双马尾，都精准地击中了“清纯系”爱好者的好球区。</li>
</ul>

<h4>🎭 反差萌：清纯外表下的“痴女”灵魂</h4>
<p>如果只是长得好看，那顶多是个花瓶。但青坂葵最可怕的地方在于她的<strong>“战斗力”</strong>。</p>
<p>根据设定，这位还在读大学的 20 岁妹子，虽然外表是参加“花道社团”的乖乖女，但私底下却是个<strong>重度 AV 爱好者</strong>，性欲极强。她来拍片的原因很简单：<strong>想和最强的枪切磋，追求平凡人生中没有的刺激。</strong></p>
<p><strong>实战表现令人咋舌：</strong></p>
<ol>
<li><strong>对阵武田大树</strong>：初登场的青涩感拿捏得恰到好处，但在骑乘位时流露出的享受表情，瞬间暴露了天赋。</li>
<li><strong>激战吉村卓</strong>：面对“猥琐流”宗师吉村卓，她不仅没有退缩，反而主动反击。那种面对大叔依然能兴奋地舔舐的画面，绝对不是演出来的。</li>
<li><strong>口技惊人</strong>：到了口交环节，她完全变成了一个贪婪的痴女，主动攻击的爆发力简直不像个新人。</li>
</ol>

<h4>💡 严选点评：Kawaii* 的流水线遗憾</h4>
<p>看完这部作品，我心中只有一个疑问：<strong>为什么这种级别的新人，会在 Kawaii* 这种流水线片商出道？</strong></p>
<p>她的素质完全可以去 S1 争夺年度新人的宝座。可惜的是，目前她还没有开通社交账号，加上 Kawaii* 的“用完即弃”风格，如果不抓紧机会，这位“一亿分之一”的美少女可能真的会像流星一样划过。</p>
<p><strong>建议：</strong> 不要犹豫，直接加入 1 月必看清单。且看且珍惜！</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #青坂葵 #青坂あおい #Kawaii* #超级新人 #白虎 #反差萌</p>
<p><strong>📌 番号：</strong> CAWD-918<br>
<strong>📅 发行日：</strong> 2026/01/06</p>
    `);
    toast.success("青坂葵文案已填充，请上传封面图后保存！");
  };

  // 雪代一凤 演示文案填充
  const fillYukishiroDemo = () => {
    setArticleTitle("【严选情报】(FC2-4810346) 事务所爆雷引发的“下马”惨案？H杯美大生雪代一凤 (雪代美凤) 震撼流出！");
    setArticleContent(`
<p>最近有一部 FC2 的片子在老司机圈子里炸开了锅。番号是 <strong>FC2-PPV-4810346</strong>。</p>
<p>标题写得很诱人：“超大型上市企业 OL，拥有成熟魅力的极品尤物，被社会底层的拍摄者中出”。这种“高岭之花堕落”的题材向来是流量密码，更何况——<strong>这是一支无码片（下马作品）。</strong></p>

<h4>🔍 她是谁？一位消失的“大型新人”</h4>
<p>阅片无数的朋友可能一眼就认出来了，这不就是去年暑假在 OPPAI 出道的 <strong>雪代一凤 (雪代一鳳)</strong> 吗？</p>
<p>简单回顾一下她的履历：</p>
<ul>
<li><strong>出道即巅峰</strong>：主打“白天是美术系大学生，晚上是泰国浴泡姬”的双面人设。H 罩杯的豪乳加上在风俗店练就的实战技巧，让她一出道就备受关注。</li>
<li><strong>改名风波</strong>：后来移籍到了事务所 Bambi Promotion，改名为 <strong>雪代美凤 (雪代美鳳)</strong>。</li>
<li><strong>稳步上升</strong>：虽然不算顶流，但发片稳定，今年 10 月还在搞店铺活动，看起来前途一片大好。</li>
</ul>

<h4>📉 为什么突然“下马”了？</h4>
<p>一般来说，现役女优很少会去拍 FC2（除非是私下流出）。而雪代美凤这次的“下马”，背后其实是一场<strong>事务所的崩塌</strong>。</p>
<p>有心的粉丝可能已经发现，她的 X (Twitter) 账号已经注销，事务所官网也没了她的资料。<strong>她“人间蒸发”了。</strong></p>
<p><strong>真相是：</strong> 她所在的事务所 Bambi Promotion 前阵子爆了大雷。同社女优蓝芽水月爆料酬劳被私吞，导致旗下女优集体“逃难”。雪代美凤显然也是受害者之一，她没有选择转投其他事务所继续当 AV 女优，而是直接选择了<strong>“下马”</strong>。</p>

<h4>💡 严选点评</h4>
<p>对于她个人来说，这可能是一种无奈的止损，或者对业界的报复；但对于我们 LSP 来说，<strong>这绝对是一份厚礼。</strong></p>
<p>在有码时期，我们就只能隔着马赛克想象那对 H 罩杯的真实模样。而现在，一切都毫无保留地展现在眼前。虽然画质和打光不如片商作品那么精致，但那种<strong>“褪去包装后的真实肉感”</strong>，反而更加实用。</p>
<p><strong>这就是业界残酷的真相：一个事务所的倒塌，换来了无数硬盘的狂欢。</strong></p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #雪代一凤 #雪代美凤 #FC2 #无码流出 #H罩杯 #事务所爆雷</p>
<p><strong>📌 番号：</strong> FC2-PPV-4810346</p>
    `);
    toast.success("雪代一凤文案已填充，请上传封面图后保存！");
  };

  // 林芽依 演示文案填充
  const fillMeiDemo = () => {
    setArticleTitle("【严选鉴赏】(IPZZ-780) IP社捡到宝了？“童话级”混血美少女林芽依 (Hayashi Mei) 究竟是何方神圣？");
    setArticleContent(`
<p>2026 年刚开年，<strong>Ideapocket (IP社)</strong> 就甩出了一张王炸。</p>
<p>虽然没赶上去年底“江南四大才子”的混战，但这位压轴登场的新人——<strong>林芽依 (Hayashi Mei)</strong>，其素质之高，完全不输给任何一位顶流新人。片商给她的定位非常夸张：<strong>“宛如从童话里走出来的神秘美少女”。</strong></p>

<h4>🧚‍♀️ 这里的“林”是 Hayashi！</h4>
<p>首先澄清一个误区，看到“林”这个姓氏，很多人第一反应以为是华人外援。但其实她的名字发音是 <strong>Hayashi Mei</strong>，是土生土长的日本人（不过官方宣传片透露她是混血儿，虽然没说是混哪里的）。</p>
<p>看看这张封面，IP社特意用了这种“绿野仙踪”般的森系风格，就是为了突显她身上那种<strong>“透明感”</strong>和<strong>“妖精气质”</strong>。</p>

<h4>💎 神之数据：Spec 值 121 的含金量</h4>
<p>对于身材控来说，林芽依的数据简直是“极品”：</p>
<ul>
<li><strong>身高</strong>：161 cm</li>
<li><strong>体重</strong>：40 kg</li>
</ul>
<p>业界有个概念叫“Spec值”（身高-体重），通常超过 110 就算身材很好，而林芽依的数值高达 <strong>121</strong>！<br>
这意味着什么？意味着她拥有<strong>极致纤细的腰身</strong>和<strong>轻盈的体态</strong>，虽然不是巨乳（E罩杯），但这种<strong>“微乳+细腰”</strong>的搭配，才是最顶级的“美少女奢华配置”。</p>

<h4>🔥 反差萌：清纯脸蛋下的“老司机”</h4>
<p>别看她长得像个不食人间烟火的精灵，实际上她可是个“懂行”的练家子。</p>
<p>她在受访时自曝：出道前就经常在推特上关注业界动态，而且<strong>每周自慰至少 3 次</strong>。这种<strong>“知性美少女”</strong>的反差设定，真的太戳人了。</p>
<p><strong>实战表现：</strong></p>
<ul>
<li><strong>女友感爆棚</strong>：她的笑容非常甜美（有点像 Moodyz 的井上桃），在片中展现出的那种羞涩又期待的眼神，简直就是“初恋女友”的代名词。</li>
<li><strong>意外的努力</strong>：虽然是新人，但她完全没有“木头人”的尴尬。口交时的眼神交流、被插入时为了配合镜头而调整的角度，以及骑乘位时卖力的扭动，都让人看到了她的<strong>“敬业”</strong>和<strong>“天赋”</strong>。</li>
</ul>

<h4>💡 严选点评</h4>
<p>如果你厌倦了那些整容脸或者只会叫床的流水线女优，林芽依绝对能给你带来久违的<strong>“心动感”</strong>。</p>
<p>她就像是你在大学图书馆偶遇的那个混血学妹，看似高冷神秘，实则内心火热。IP社这次确实捡到宝了，这位“童话美少女”绝对有资格竞争 2026 年的最强新人。</p>

<p><strong>✅ 推荐指数：⭐⭐⭐⭐⭐</strong><br>
<strong>🔥 关键词：</strong> #林芽依 #HayashiMei #IP社 #混血美少女 #透明感 #纤细身材</p>
<p><strong>📌 番号：</strong> IPZZ-780<br>
<strong>📅 发行日：</strong> 2026/01/13</p>
    `);
    toast.success("林芽依文案已填充，请上传封面图后保存！");
  };

  const handleArticleSubmit = async (status: 'published' | 'draft' = 'published') => {
    if (!articleTitle || !articleContent) return toast.warning("内容不完整");
    if (!editingArticleId && !articleFile) return toast.warning("请上传封面");
    setLoading(true);
    try {
      let coverUrl = "";
      if (articleFile) { const fileName = `art-${Date.now()}-${articleFile.name}`; const { error: upErr } = await supabase.storage.from("covers").upload(fileName, articleFile); if (upErr) throw upErr; coverUrl = supabase.storage.from("covers").getPublicUrl(fileName).data.publicUrl; }

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
                {!editingArticleId && (
                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="sm" onClick={fillKarenDemo} className="text-xs border-pink-200 text-pink-600 hover:bg-pink-50">🌸 枫花恋</Button>
                    <Button variant="outline" size="sm" onClick={fillSodDemo} className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50">🏢 SOD共演</Button>
                    <Button variant="outline" size="sm" onClick={fillAiseDemo} className="text-xs border-purple-200 text-purple-600 hover:bg-purple-50">♨️ 爱才莉亚</Button>
                    <Button variant="outline" size="sm" onClick={fillAoiDemo} className="text-xs border-green-200 text-green-600 hover:bg-green-50">💎 青坂葵</Button>
                    <Button variant="outline" size="sm" onClick={fillYukishiroDemo} className="text-xs border-orange-200 text-orange-600 hover:bg-orange-50">🔥 雪代一凤</Button>
                    <Button variant="outline" size="sm" onClick={fillMeiDemo} className="text-xs border-teal-200 text-teal-600 hover:bg-teal-50">🧚‍♀️ 林芽依</Button>
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
