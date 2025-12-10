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

interface Article {
  id: number;
  title: string;
  cover_url: string;
  content: string;
  created_at: string;
  view_count: number;
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
            className="prose prose-blue max-w-none prose-img:rounded-xl prose-img:w-full text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
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
