"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/src/lib/supabaseClient";
import Link from "next/link";
import { ArrowLeft, Send, User, Share2, Link as LinkIcon, QrCode, Heart, MessageSquare, ThumbsUp, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QRCodeCanvas } from "qrcode.react";

export interface Article {
  id: number;
  title: string;
  cover_url: string;
  content: string;
  created_at: string;
  view_count: number;
  like_count: number;
  designation?: string;
}

export interface Comment {
  id: number;
  nickname: string;
  content: string;
  created_at: string;
  like_count: number;
  parent_id: number | null;
  children?: Comment[];
}

function MysteryButton({ code }: { code: string }) {
  const [status, setStatus] = useState<'idle' | 'captcha' | 'revealed' | 'cooldown'>('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const [captcha, setCaptcha] = useState({ a: 0, b: 0 });
  const [answer, setAnswer] = useState("");
  const [realCode, setRealCode] = useState("");

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
      try {
        const decoded = decodeURIComponent(atob(code));
        setRealCode(decoded);
        setStatus('revealed');
        setTimeLeft(10);
        setTimeout(() => {
          setStatus('cooldown');
          setTimeLeft(60);
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

function ShareSection({ title, id }: { title: string, id: string }) {
  const [showQr, setShowQr] = useState(false);
  const [safeUrl, setSafeUrl] = useState("");

  useEffect(() => {
    const origin = window.location.origin;
    const url = `${origin}/guide.html?target=${encodeURIComponent(`/blog/${id}`)}`;
    setSafeUrl(url);
  }, [id]);

  const handleCopyLink = async () => {
    if (!safeUrl) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(safeUrl);
        toast.success("链接已复制，快去分享给好友吧！");
      } else {
        throw new Error("Clipboard API not available");
      }
    } catch (err) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = safeUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          toast.success("链接已复制，快去分享给好友吧！");
        } else {
          toast.error("复制失败，请手动复制");
        }
      } catch (fallbackErr) {
        toast.error("复制失败，请手动复制");
      }
    }
  };

  const handleSystemShare = async () => {
    if (navigator.share && safeUrl) {
      try {
        await navigator.share({
          title: title,
          text: `推荐阅读：${title}`,
          url: safeUrl,
        });
      } catch (err) {
        // console.log("分享取消或失败", err);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <div className="h-[1px] w-12 bg-gray-200"></div>
        <span>分享给好友</span>
        <div className="h-[1px] w-12 bg-gray-200"></div>
      </div>

      <div className="flex gap-6">
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full w-12 h-12 border-gray-200 hover:bg-gray-50 hover:text-blue-600 transition-colors"
            onClick={handleCopyLink}
          >
            <LinkIcon className="w-5 h-5" />
          </Button>
          <span className="text-xs text-gray-500">复制链接</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full w-12 h-12 border-gray-200 hover:bg-green-50 hover:text-green-600 transition-colors"
            onClick={() => setShowQr(true)}
          >
            <QrCode className="w-5 h-5" />
          </Button>
          <span className="text-xs text-gray-500">微信/朋友圈</span>
        </div>

        <div className="flex flex-col items-center gap-2 md:hidden">
           <Button
            variant="outline"
            size="icon"
            className="rounded-full w-12 h-12 border-gray-200 hover:bg-gray-50 transition-colors"
            onClick={handleSystemShare}
          >
            <Share2 className="w-5 h-5" />
          </Button>
          <span className="text-xs text-gray-500">更多</span>
        </div>
      </div>

      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="sm:max-w-sm flex flex-col items-center">
          <DialogHeader>
            <DialogTitle className="text-center">分享到微信</DialogTitle>
            <DialogDescription className="text-center">
              使用微信“扫一扫”，或截屏保存分享
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-white rounded-xl shadow-sm border mt-2">
            {safeUrl && (
              <QRCodeCanvas
                value={safeUrl}
                size={200}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"L"}
                includeMargin={false}
              />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center max-w-[200px]">
            扫码后会自动检测环境，引导至浏览器打开，防止链接被拦截
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  isChild?: boolean;
  likedComments: number[];
  handleLikeComment: (id: number) => void;
  replyingTo: number | null;
  setReplyingTo: (id: number | null) => void;
  replyContent: string;
  setReplyContent: (content: string) => void;
  handleSubmitReply: (parentId: number) => void;
  submitting: boolean;
}

const CommentItem = ({
  comment,
  isChild = false,
  likedComments,
  handleLikeComment,
  replyingTo,
  setReplyingTo,
  replyContent,
  setReplyContent,
  handleSubmitReply,
  submitting
}: CommentItemProps) => {
  return (
    <div className={`flex gap-3 ${isChild ? "mt-4 ml-10 border-l-2 pl-4 border-gray-100" : ""}`}>
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

        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <button
            onClick={() => handleLikeComment(comment.id)}
            className={`flex items-center gap-1 hover:text-red-500 transition-colors ${likedComments.includes(comment.id) ? "text-red-500" : ""}`}
          >
            <ThumbsUp className="w-3 h-3" />
            <span>{comment.like_count || 0}</span>
          </button>
          <button
            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
            className="flex items-center gap-1 hover:text-blue-500 transition-colors"
          >
            <MessageCircle className="w-3 h-3" />
            <span>回复</span>
          </button>
        </div>

        {replyingTo === comment.id && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-2">
             <Input
              placeholder={`回复 @${comment.nickname}...`}
              className="mb-2 text-sm h-9"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)} className="h-7 text-xs">取消</Button>
              <Button size="sm" onClick={() => handleSubmitReply(comment.id)} disabled={submitting} className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
                发送回复
              </Button>
            </div>
          </div>
        )}

        {comment.children && comment.children.length > 0 && (
          <div className="mt-2">
            {comment.children.map(child => (
              <CommentItem
                key={child.id}
                comment={child}
                isChild={true}
                likedComments={likedComments}
                handleLikeComment={handleLikeComment}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                replyContent={replyContent}
                setReplyContent={setReplyContent}
                handleSubmitReply={handleSubmitReply}
                submitting={submitting}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface BlogDetailClientProps {
  initialArticle: Article;
  initialComments: Comment[];
}

export default function BlogDetailClient({ initialArticle, initialComments }: BlogDetailClientProps) {
  const [article, setArticle] = useState<Article>(initialArticle);
  const [comments, setComments] = useState<Comment[]>(initialComments);

  // 评论表单状态
  const [nickname, setNickname] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 回复和点赞状态
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [articleLiked, setArticleLiked] = useState(false);
  const [likedComments, setLikedComments] = useState<number[]>([]);

  useEffect(() => {
    // 初始化本地点赞状态
    const likedArticles = JSON.parse(localStorage.getItem('liked_articles') || '[]');
    setArticleLiked(likedArticles.includes(article.id));

    const likedCommentsStorage = JSON.parse(localStorage.getItem('liked_comments') || '[]');
    setLikedComments(likedCommentsStorage);

    // 增加浏览量 (静默操作)
    const incrementView = async () => {
      await supabase.from("articles").update({ view_count: (article.view_count || 0) + 1 }).eq("id", article.id);
    };
    incrementView();
  }, [article.id]); // Run once per article id

  // 文章点赞
  const handleLikeArticle = async () => {
    if (articleLiked) {
      setArticleLiked(false);
      setArticle(prev => ({ ...prev, like_count: Math.max((prev.like_count || 0) - 1, 0) }));

      const likedArticles = JSON.parse(localStorage.getItem('liked_articles') || '[]');
      const newLikedArticles = likedArticles.filter((id: any) => id !== article.id);
      localStorage.setItem('liked_articles', JSON.stringify(newLikedArticles));

      const { error } = await supabase.rpc('decrement_article_likes', { article_id: article.id });
      if (error) {
         // 回滚逻辑略，保持乐观更新
      }
    } else {
      setArticleLiked(true);
      setArticle(prev => ({ ...prev, like_count: (prev.like_count || 0) + 1 }));

      const likedArticles = JSON.parse(localStorage.getItem('liked_articles') || '[]');
      if (!likedArticles.includes(article.id)) {
          localStorage.setItem('liked_articles', JSON.stringify([...likedArticles, article.id]));
      }

      const { error } = await supabase.rpc('increment_article_likes', { article_id: article.id });
    }
    toast.success("操作成功！");
  };

  // 评论点赞
  const handleLikeComment = async (commentId: number) => {
    const isLiked = likedComments.includes(commentId);

    if (isLiked) {
      setLikedComments(prev => prev.filter(id => id !== commentId));
      setComments(prev => updateCommentLike(prev, commentId, -1));

      localStorage.setItem('liked_comments', JSON.stringify(likedComments.filter(id => id !== commentId)));
      await supabase.rpc('decrement_comment_likes', { comment_id: commentId });
    } else {
      setLikedComments(prev => [...prev, commentId]);
      setComments(prev => updateCommentLike(prev, commentId, 1));

      localStorage.setItem('liked_comments', JSON.stringify([...likedComments, commentId]));
      await supabase.rpc('increment_comment_likes', { comment_id: commentId });
      toast.success("点赞成功！");
    }
  };

  const updateCommentLike = (list: Comment[], targetId: number, delta: number): Comment[] => {
    return list.map(c => {
      if (c.id === targetId) return { ...c, like_count: Math.max((c.like_count || 0) + delta, 0) };
      if (c.children && c.children.length > 0) return { ...c, children: updateCommentLike(c.children, targetId, delta) };
      return c;
    });
  };

  const handleSubmitComment = async () => {
    if (!commentContent.trim()) {
      toast.warning("写点什么再发吧~");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("comments").insert({
        article_id: article.id,
        nickname: nickname || "匿名绅士",
        content: commentContent,
        is_approved: false
      });

      if (error) throw error;

      toast.success("留言已提交，管理员审核后显示 ✅");
      setCommentContent("");
    } catch (error) {
      toast.error("发送失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: number) => {
    if (!replyContent.trim()) {
      toast.warning("回复内容不能为空");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("comments").insert({
        article_id: article.id,
        nickname: nickname || "匿名绅士",
        content: replyContent,
        parent_id: parentId,
        is_approved: false
      });

      if (error) throw error;

      toast.success("回复已提交，审核后显示 ✅");
      setReplyContent("");
      setReplyingTo(null);
    } catch (error) {
      toast.error("回复失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b px-4 py-3 flex items-center gap-3">
        <Link href="/blog">
          <Button variant="ghost" size="icon" className="-ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="font-bold text-gray-800 line-clamp-1 flex-1">{article.title}</h1>
      </div>

      <div className="max-w-2xl mx-auto">
        <article className="p-5">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
            {article.title}
          </h1>
          <div className="text-xs text-gray-400 mb-6 flex items-center gap-4">
            <span>{new Date(article.created_at).toLocaleDateString()}</span>
            <span>阅读 {article.view_count}</span>
          </div>

          <div className="relative">
             <div
              className="prose prose-blue max-w-none prose-img:!rounded-2xl prose-img:w-full text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: article.content.replace(
                  /(https?:\/\/[^\s"']+\/storage\/v1\/object\/public\/[^\s"']+)/g,
                  '/api/proxy-image?url=$1'
                )
              }}
            />
          </div>

          {article.designation && (
            <div id="mystery-button" className="mt-8 mb-6 scroll-mt-20">
              <MysteryButton code={btoa(encodeURIComponent(article.designation))} />
            </div>
          )}

          <div className="mt-12 flex items-center justify-between">
            <div className="text-xs text-gray-400 flex gap-4">
              <span>阅读 {article.view_count}</span>
              <span>喜欢 {article.like_count || 0}</span>
            </div>

            <Button
              variant={articleLiked ? "default" : "outline"}
              className={`rounded-full gap-2 transition-all ${articleLiked ? "bg-red-500 hover:bg-red-600 border-red-500" : "border-red-200 text-red-500 hover:bg-red-50"}`}
              onClick={handleLikeArticle}
            >
              <Heart className={`w-4 h-4 ${articleLiked ? "fill-current" : ""}`} />
              {articleLiked ? "已赞" : "点赞"}
            </Button>
          </div>
        </article>

        <hr className="my-8 border-gray-100" />
        <ShareSection title={article.title} id={article.id.toString()} />
        <hr className="my-8 border-gray-100" />

        <div className="px-5">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            精选留言 <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{comments.reduce((acc, curr) => acc + 1 + (curr.children?.length || 0), 0)}</span>
          </h3>

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

          <div className="space-y-6">
            {comments.length === 0 ? (
              <div className="text-center py-10 text-gray-300 text-sm">暂无留言，快来抢沙发~</div>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  likedComments={likedComments}
                  handleLikeComment={handleLikeComment}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  replyContent={replyContent}
                  setReplyContent={setReplyContent}
                  handleSubmitReply={handleSubmitReply}
                  submitting={submitting}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
