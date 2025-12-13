import { supabase } from "@/src/lib/supabaseClient";
import HomeClient, { Banner, Resource } from "@/components/home/HomeClient";

// 🔥 启用 ISR (Incremental Static Regeneration)
// 每一分钟重新生成一次页面，减轻 Supabase 压力，同时保证速度
export const revalidate = 60;

export default async function Home() {
  try {
    // 并行获取数据，加快速度
    const [resourcesRes, bannersRes] = await Promise.all([
      supabase
        .from("resources")
        .select("*")
        .order("id", { ascending: false })
        .range(0, 11),
      supabase
        .from("banners")
        .select("*")
        .order("created_at", { ascending: false })
    ]);

    const resources = resourcesRes.data || [];
    const banners = bannersRes.data || [];

    return (
      <HomeClient
        initialResources={resources as Resource[]}
        initialBanners={banners as Banner[]}
      />
    );
  } catch (error) {
    console.error("Home Page SSR Error:", error);
    // 出错时返回空数据，由客户端组件处理（或者显示错误页，这里选择降级为空）
    return <HomeClient initialResources={[]} initialBanners={[]} />;
  }
}
