const hero = {
  title: "konomi",
  lead: "見た動画・聴いた曲・高評価・フォローを自分の Cloudflare に集め、AI が MCP で読めるようにする。",
  action: "GitHub で見る",
  href: "https://github.com/masseater/konomi",
} as const;

const features = {
  title: "できること",
  items: [
    {
      title: "サービスをまたいで探せる",
      body: "search_activity が、どのサービスで見たか聴いたかを問わず、語や期間で記録を引く。",
    },
    {
      title: "好みの傾向を渡せる",
      body: "taste_summary が、よく見る投稿者やサービスごとの件数をまとめて AI に渡す。",
    },
    {
      title: "記録は自分の手元に置く",
      body: "取り込んだ記録とログイン情報は、自分の Cloudflare アカウントの D1 にだけ入る。",
    },
  ],
} as const;

const steps = {
  title: "始め方",
  items: [
    "このリポジトリを fork して apps/web/alchemy.run.ts の DEFAULT_DOMAIN を自分のドメインにする",
    "Cloudflare にデプロイし、サイトで持ち主のアカウントを作る",
    "サービスのログイン情報を貼り、MCP クライアントに /mcp を登録する",
  ],
} as const;

export { features, hero, steps };
