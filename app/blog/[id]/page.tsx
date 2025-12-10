"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import Image from "next/image";

interface Article {
  id: number;
  title: string;
  cover_url: string;
  content: string;
  created_at: string;
  view_count: number;
  designation?: string; // 🔥 番号字段
}

// 🔥 神秘按钮组件
function MysteryButton({ code }: { code: string }) {
  const [status, setStatus] = useState<'idle' | 'captcha' | 'revealed' | 'cooldown'>('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const [captcha, setCaptcha] = useState({ a: 0, b: 0 });
  const [answer, setAnswer] = useState("");
  const [realCode, setRealCode] = useState(""); // 🔥 存储解密后的真番号

  // 倒计时逻辑
  useEffect(() => {
    if (timeLeft <= 0) {
      if (status === 'revealed') setStatus('cooldown');
      if (status === 'cooldown') setStatus('idle');
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, status]);

  const handleStart = () => {
    setCaptcha({ a: Math.floor(Math.random() * 10) + 1, b: Math.floor(Math.random() * 10) + 1 });
    setStatus('captcha');
    setAnswer("");
  };

  const handleVerify = () => {
    if (parseInt(answer) === captcha.a + captcha.b) {
      // 🔥 验证通过时才解密 Base64
      try {
        const decoded = decodeURIComponent(atob(code));
        setRealCode(decoded);
        setStatus('revealed');
        setTimeLeft(10); // 展示10秒
        setTimeout(() => {
          setStatus('cooldown');
          setTimeLeft(60); // 冷却60秒
        }, 10000);
      } catch (e) {
        toast.error("解码失败");
      }
    } else {
      toast.error("算错啦，再试一次吧~");
      handleStart();
    }
  };

  if (status === 'idle') {
    return (
      <Button onClick={handleStart} variant="outline" className="w-full border-pink-200 text-pink-500 hover:bg-pink-50 hover:text-pink-600">
        🔒 点击查看神秘代码
      </Button>
    );
  }

  if (status === 'captcha') {
    return (
      <div className="flex gap-2 items-center animate-in fade-in zoom-in duration-300">
        <div className="bg-pink-50 px-3 py-2 rounded-md text-pink-600 font-mono font-bold text-sm select-none">
          {captcha.a} + {captcha.b} = ?
        </div>
        <Input
          className="w-20 text-center"
          placeholder="答案"
          autoFocus
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
        />
        <Button size="sm" onClick={handleVerify} className="bg-pink-500 hover:bg-pink-600 text-white">
          确认
        </Button>
      </div>
    );
  }

  if (status === 'revealed') {
    return (
      <div className="w-full bg-pink-100 border border-pink-200 rounded-lg p-4 text-center animate-in slide-in-from-top-2">
        <p className="text-xs text-pink-400 mb-1">阅后即焚 ({timeLeft}s)</p>
        <p className="text-2xl font-mono font-bold text-pink-600 select-all tracking-wider">{realCode}</p>
      </div>
    );
  }

  if (status === 'cooldown') {
    return (
      <Button disabled variant="secondary" className="w-full bg-gray-100 text-gray-400 cursor-not-allowed">
        ⏳ 技能冷却中 ({timeLeft}s)
      </Button>
    );
  }

  return null;
}

interface Comment {
  id: number;
  nickname: string;
  content: string;
  created_at: string;
}

export default function BlogPostPage() {
  const { id } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  // 评论表单状态
  const [nickname, setNickname] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;

    // 1. 获取文章详情
    const fetchArticle = async () => {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .eq("status", "published") // 🔥 确保草稿无法通过 URL 访问
        .single();

      if (data) {
        setArticle(data);
        // 增加浏览量 (静默操作)
        await supabase.from("articles").update({ view_count: (data.view_count || 0) + 1 }).eq("id", id);
      }
      setLoading(false);
    };

    // 2. 获取已审核通过的评论
    const fetchComments = async () => {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("article_id", id)
        .eq("is_approved", true) // 🔥 关键：只显示审核通过的
        .order("created_at", { ascending: false });
      if (data) setComments(data);
    };

    fetchArticle();
    fetchComments();
  }, [id]);

  // 提交评论
  const handleSubmitComment = async () => {
    if (!commentContent.trim()) {
      toast.warning("写点什么再发吧~");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("comments").insert({
        article_id: id,
        nickname: nickname || "匿名绅士",
        content: commentContent,
        is_approved: false // 🔥 关键：默认不通过
      });

      if (error) throw error;

      toast.success("留言已提交，管理员审核后显示 ✅");
      setCommentContent(""); // 清空输入框
    } catch (error) {
      toast.error("发送失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;
  if (!article) return <div className="text-center py-20">文章不存在</div>;

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b px-4 py-3 flex items-center gap-3">
        <Link href="/blog">
          <Button variant="ghost" size="icon" className="-ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="font-bold text-gray-800 line-clamp-1 flex-1">{article.title}</h1>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* 文章主体 */}
        <article className="p-5">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
            {article.title}
          </h1>
          <div className="text-xs text-gray-400 mb-6 flex items-center gap-4">
            <span>{new Date(article.created_at).toLocaleDateString()}</span>
            <span>阅读 {article.view_count}</span>
          </div>

          {/* HTML 内容渲染区 */}
          <div
            className="prose prose-blue max-w-none prose-img:!rounded-2xl prose-img:w-full text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* 🔥 神秘代码区域 - 移至文章底部 */}
          {article.designation && (
            <div className="mt-8 mb-6">
              {/* 🔥 服务端传给客户端前进行 Base64 编码混淆 */}
          <MysteryButton code={btoa(encodeURIComponent(article.designation))} />
            </div>
          )}
        </article>

        <hr className="my-8 border-gray-100" />

        {/* 评论区 */}
        <div className="px-5">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            精选留言 <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{comments.length}</span>
          </h3>

          {/* 评论输入框 */}
          <div className="bg-gray-50 p-4 rounded-xl mb-8 space-y-3">
            <Input
              placeholder="昵称 (选填)"
              className="bg-white"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <Textarea
              placeholder="友善发言，评论人工审核，请勿发表违规内容..."
              className="bg-white min-h-[80px]"
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
            />
            <div className="flex justify-end">
              <Button onClick={handleSubmitComment} disabled={submitting} className="gap-2">
                <Send className="w-4 h-4" />
                {submitting ? "发送中..." : "发送留言"}
              </Button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              温馨提示：留言需通过审核才会显示，请勿发布广告。
            </p>
          </div>

          {/* 评论列表 */}
          <div className="space-y-6">
            {comments.length === 0 ? (
              <div className="text-center py-10 text-gray-300 text-sm">暂无留言，快来抢沙发~</div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-gray-700">{comment.nickname}</span>
                      <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg rounded-tl-none">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
