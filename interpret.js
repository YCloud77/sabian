/*
 * interpret.js — ルールベース統合リーディングエンジン
 * すべてのテキストはこのアプリのために書き下ろしたオリジナル。
 * 語り口: 観察的・非断定（「〜の傾向」「〜が出やすい」）。運命の断定・医療/金銭の助言はしない。
 * UMD: ブラウザでは window.SabianInterpret、Node では module.exports。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./sabian.js"), require("./chart.js"));
  } else {
    root.SabianInterpret = factory(root.SABIAN, root.SabianChart);
  }
})(typeof self !== "undefined" ? self : this, function (SABIAN, SabianChart) {
  "use strict";

  // ========== データ層 ==========

  const SIGNS = ["牡羊座","牡牛座","双子座","蟹座","獅子座","乙女座","天秤座","蠍座","射手座","山羊座","水瓶座","魚座"];

  const SIGN_KEYWORDS = {
    "牡羊座": "開拓・率直・スピード", "牡牛座": "安定・五感・持続", "双子座": "好奇心・言葉・軽やかさ",
    "蟹座": "共感・保護・身内", "獅子座": "表現・誇り・あたたかさ", "乙女座": "分析・実務・気配り",
    "天秤座": "調和・社交・美意識", "蠍座": "深さ・集中・信頼", "射手座": "探求・楽観・自由",
    "山羊座": "責任・達成・堅実", "水瓶座": "独創・友愛・未来", "魚座": "感受性・想像・包容",
  };

  const ELEMENT_OF = {
    "牡羊座": "火", "獅子座": "火", "射手座": "火",
    "牡牛座": "地", "乙女座": "地", "山羊座": "地",
    "双子座": "風", "天秤座": "風", "水瓶座": "風",
    "蟹座": "水", "蠍座": "水", "魚座": "水",
  };

  const MODALITY_OF = {
    "牡羊座": "活動宮", "蟹座": "活動宮", "天秤座": "活動宮", "山羊座": "活動宮",
    "牡牛座": "不動宮", "獅子座": "不動宮", "蠍座": "不動宮", "水瓶座": "不動宮",
    "双子座": "柔軟宮", "乙女座": "柔軟宮", "射手座": "柔軟宮", "魚座": "柔軟宮",
  };

  // 伝統的ルーラー
  const RULER_OF = {
    "牡羊座": "火星", "牡牛座": "金星", "双子座": "水星", "蟹座": "月",
    "獅子座": "太陽", "乙女座": "水星", "天秤座": "金星", "蠍座": "火星",
    "射手座": "木星", "山羊座": "土星", "水瓶座": "土星", "魚座": "木星",
  };

  const HOUSE_THEME = {
    1: "自分自身・第一印象", 2: "お金・才能・所有", 3: "学び・言葉・身近な縁",
    4: "家・家族・心の土台", 5: "創造・遊び・恋愛", 6: "仕事・健康・日課",
    7: "パートナー・対人関係", 8: "深い結びつき・継承", 9: "探求・旅・思想",
    10: "社会的役割・キャリア", 11: "仲間・ネットワーク・未来", 12: "内面世界・静けさ・癒し",
  };

  // 天体 × サイン（サイン順: 牡羊→魚）
  const PLANET_SIGN = {
    "太陽": [
      "思い立ったら即動く推進力。自分で切り拓くことに生きがいを感じやすい",
      "五感で確かめながらじっくり進む安定志向。心地よさと持続が人生の軸になりやすい",
      "好奇心が原動力。情報や人をつなぎ、変化の中で生き生きしやすい",
      "身近な人や場を守り育てることに力が湧く。共感が行動の軸になりやすい",
      "自分らしく表現し認められることが活力源。場を明るくする存在感が出やすい",
      "細部を整え役に立つことに喜びを見出す。実務と改善の人になりやすい",
      "人との関わりの中で自分を形づくるタイプ。調和とバランス感覚が持ち味になりやすい",
      "一つのことに深く没入する集中力。表には出ない情の深さが核にありやすい",
      "遠くへ向かう探求心が生きる軸。楽観と自由を求める傾向",
      "目標へ向けて着実に積み上げる人。責任を引き受けるほど力が出やすい",
      "枠にとらわれない視点が持ち味。仲間と未来志向でつながる傾向",
      "境界のやわらかい感受性。流れに寄り添いながら周囲を包み込む力が出やすい",
    ],
    "月": [
      "感情の立ち上がりが速く素直。怒りも喜びも長くは持ち越さない傾向",
      "変化より安定に安心を感じる。心地よい環境とおいしいもので回復しやすい",
      "話すこと・知ることで気持ちが整理される。退屈が一番のストレスになりやすい",
      "身内意識が強く、安心できる相手には深く懐く。場の空気を敏感に受け取りやすい",
      "認められると素直に嬉しいタイプ。気持ちの表現が大きく、あたたかい傾向",
      "心配ごとを細かく考えがち。段取りが整うと気持ちも落ち着きやすい",
      "誰かと一緒にいることで安定する。争いの空気が苦手な傾向",
      "感情を簡単には見せないが、内側は濃い。信頼した相手には一途になりやすい",
      "気持ちの切り替えが早く、閉塞感が苦手。移動や学びが心の栄養になりやすい",
      "感情より役割を優先しがち。弱音を見せるまでに時間がかかる傾向",
      "感情と少し距離を置いて眺めるクセ。束縛されない関係に安心しやすい",
      "周囲の感情が流れ込みやすい繊細さ。ひとりで浸る時間が回復の鍵になりやすい",
    ],
    "水星": [
      "結論から話す速い頭の回転。思いつきをすぐ言葉にする傾向",
      "ゆっくり確実に考えるタイプ。一度理解したことは長く定着しやすい",
      "軽やかで多彩な話題運び。言葉とユーモアの瞬発力が持ち味",
      "気持ちに寄り添う話し方。記憶と共感で物事を理解しやすい",
      "物語るように話す表現力。伝え方に熱とドラマが乗りやすい",
      "分析と整理が得意な実務頭脳。正確さへのこだわりが出やすい",
      "相手に合わせた言葉選びが上手。比較検討して決める思考の傾向",
      "本質を見抜く洞察型の思考。口数は少なくても考えは深い傾向",
      "大きな絵で考える発想力。細部より意味と方向性を掴みやすい",
      "実用本位の堅実な思考。計画に落とし込む力が出やすい",
      "独自の切り口とひらめき。常識を疑うところから考える傾向",
      "イメージで捉える直感的な頭。言葉にならない機微を感じ取りやすい",
    ],
    "金星": [
      "ストレートで駆け引きのない好意表現。好みは一目惚れ型になりやすい",
      "上質さと心地よさを愛する審美眼。ゆっくり深まる関係を好みやすい",
      "会話の弾む相手に惹かれる。軽やかで風通しのよい関係を好む傾向",
      "世話を焼き合うことで愛情を確かめる。家庭的な親密さを求めやすい",
      "愛情表現は華やかで気前がよい。特別扱いされることに喜びを感じやすい",
      "さりげない気配りで愛情を示す。派手さより誠実さを選ぶ傾向",
      "洗練された美意識と社交性。対等でバランスのよい関係を求めやすい",
      "浅い付き合いでは満たされない深い結びつき志向。独占欲が顔を出すことも",
      "一緒に冒険できる相手に惹かれる。束縛のないおおらかな愛し方をしやすい",
      "時間をかけて信頼を育てる堅実な愛情。形にして示す傾向",
      "友情の延長にある恋愛観。個を尊重し合う距離感を大切にしやすい",
      "相手に溶け込むような献身的な愛し方。ロマンと共感を求めやすい",
    ],
    "火星": [
      "迷わず動く瞬発力。競争でこそ燃えるが、熱しやすく冷めやすい面も",
      "火がつくのは遅いが持久力は抜群。一度始めたら粘り強く続けやすい",
      "同時進行が得意な機動力。言葉が武器にも刃にもなりやすい",
      "守るものがあるときに強い。感情が行動のスイッチになりやすい",
      "堂々と正面から挑むスタイル。プライドが原動力になりやすい",
      "段取りを整えてから動く精密な実行力。批判精神が刺になることも",
      "単独より連携で力を発揮するタイプ。対立の場では調停役に回りやすい",
      "静かに燃え続ける執念型。決めたら最後までやり抜く力が出やすい",
      "目標が遠いほど燃えるタイプ。思い切りのよさとムラが同居しやすい",
      "計画的で無駄のない実行力。長期戦での勝負強さが出やすい",
      "我が道を行く独立独歩の行動力。理不尽への反骨心が原動力になりやすい",
      "気分と直感で動く波のあるエネルギー。誰かのためだと頑張れる傾向",
    ],
    "木星": [
      "新しい挑戦が幸運の入り口。先陣を切ることで道が開けやすい",
      "着実な蓄積が実を結ぶタイプ。豊かさを味わい育てる才が出やすい",
      "情報と人脈が運を運ぶ。多方面への好奇心がチャンスにつながりやすい",
      "身内やコミュニティを大切にすると発展する。守り育てる場面で恵まれやすい",
      "表現して目立つことで広がる運。堂々とふるまうほど応援されやすい",
      "丁寧な仕事ぶりが信頼と機会を呼ぶ。実務での貢献が評価されやすい",
      "人との縁がそのまま財産になる。パートナーシップで発展しやすい",
      "深く関わった物事から大きな実りを得る。継承や再生の場面で恵まれやすい",
      "学びと遠出が運を開く王道の配置。海外や専門探求との相性がよい傾向",
      "組織や実績を通じて着実に拡大する運。年齢とともに恵まれやすい",
      "新しい仕組みや仲間の輪から発展する。時代の先を行く分野と縁ができやすい",
      "与えることで巡ってくる運。想像力と癒しの領域で広がりやすい",
    ],
    "土星": [
      "自分で決めて動くことへの慎重さ。経験とともに芯の強さに変わりやすい",
      "物やお金への堅実さと不安が同居。自分の価値を認めることが課題になりやすい",
      "言葉や学びへの苦手意識が、努力を重ねるほど強みに変わりやすい",
      "甘えることへのぎこちなさ。安心の土台を自分で築くことが課題になりやすい",
      "自己表現への照れや抑制。少しずつ出すほど揺るがない自信になりやすい",
      "完璧主義による自分への厳しさ。ほどよさを学ぶことが課題になりやすい",
      "人間関係で責任を引き受けやすい。対等な関係を築く練習が課題になりやすい",
      "深い感情を封じ込めやすい傾向。少しずつ信頼を許す練習が鍵になりやすい",
      "自由や楽観への警戒心。自分なりの哲学を築くと安定しやすい",
      "責任と義務を背負い込みやすい。その分、努力が形になりやすい配置",
      "独自性を出すことへのためらい。型を学んだ先に自由が開けやすい",
      "曖昧さへの不安から線を引きがち。感受性を信じることが課題になりやすい",
    ],
    "天王星": [
      "直感的な革新性。誰もやらないことへ最初に飛び込む衝動が出やすい",
      "価値観やお金の常識を塗り替える力。マイペースな革新性が出やすい",
      "情報や言葉で常識を揺さぶる感性。新しい伝え方に敏感な傾向",
      "家族や居場所の形を問い直す感性。新しい暮らし方に開かれやすい",
      "表現の型破りさが持ち味。自分流を貫くことへの衝動が出やすい",
      "働き方や健康法の新しいやり方を取り入れる感性。効率化の才が出やすい",
      "関係性の常識にとらわれない感性。新しいパートナーシップ観を持ちやすい",
      "物事のタブーの奥を見ようとする鋭さ。変容への耐性が強い傾向",
      "思想や信念の自由を求める感性。既成の枠組みを超えたがる傾向",
      "仕組みや権威を内側から変えていく感性。現実的な改革の才が出やすい",
      "独創と友愛の感性が強まる配置。未来志向のネットワークに惹かれやすい",
      "見えない世界へ開かれた感性。直感の閃きが独特になりやすい",
    ],
    "海王星": [
      "理想に向かう情熱が広がる感性。夢を行動に翻訳しようとする傾向",
      "美と豊かさへの繊細な理想。自然や手仕事に癒しを見出しやすい",
      "言葉やイメージの世界に浸る感性。想像力豊かな表現に惹かれやすい",
      "家族や故郷への郷愁とロマン。情の通う共同体に理想を見やすい",
      "創造と自己表現への夢。芸術的なあこがれが強く出やすい",
      "奉仕と癒しへの理想。現実の細部に意味を見出す感性",
      "理想の関係性を夢見る感性。美と調和へのあこがれが強い傾向",
      "深層心理や神秘への引力。感情の深みに理想を見やすい",
      "精神的な探求への夢。遠い世界や思想へのあこがれが出やすい",
      "現実の仕組みの中に理想を実装しようとする感性。夢と実務の橋渡し役",
      "理想の社会を夢見て共有する感性。共同体的なビジョンに惹かれやすい",
      "想像力と共感が最も深まる配置。芸術や癒しの領域に開きやすい",
    ],
    "冥王星": [
      "存在をかけた自己変革の衝動。ゼロから立ち上げる爆発力を秘めやすい",
      "所有と価値の根本を変える力。粘り強い再生力が出やすい",
      "言葉と情報の力を根っこから使う資質。「知りたい」という渇きが強く出やすい",
      "家族や絆の形を根本から問う力。情の深部での変容を経やすい",
      "自己表現への強烈な衝動。創造をめぐる生まれ変わりを経やすい",
      "仕事と健康の徹底的な作り直しの力。細部への集中が極まりやすい",
      "関係性の根本的な変容の力。人との関わりで生まれ変わる経験をしやすい",
      "変容の力が最も濃い配置。危機をくぐるたびに強くなる資質",
      "信念や世界観を根本から書き換えていく力。本当のことを知りたい気持ちが強く出やすい",
      "社会構造の変革期を生きる資質。組織や権威との関わりで変容しやすい",
      "共同体と個の関係を作り直す力。集団の変革に関わりやすい",
      "集合的な感情の深みに触れる資質。夢と無意識の変容力が働きやすい",
    ],
  };

  // 天体 × ハウス（1〜12H）
  const PLANET_HOUSE = {
    "太陽": [
      "存在感が前に出るタイプ。自分の名前で立つほど輝きやすい",
      "稼ぐ・所有する営みが自己表現になる。自前の資源を築くことに力が入りやすい",
      "伝える・学ぶ・つなぐ場面が主舞台。身近なネットワークの中で輝きやすい",
      "家と土台づくりが人生の中心テーマ。プライベートの充実が力の源になりやすい",
      "創作・遊び・表現が生きる張り合い。楽しんでいるときに最も力が出やすい",
      "日々の仕事と役に立つ実感が軸。任された持ち場で輝きやすい",
      "一対一の関係の中で自分が磨かれる。パートナーシップが人生の主題になりやすい",
      "人と深く関わり合う場面が主舞台。受け継ぐもの・託されるものと縁が深い傾向",
      "遠くへの探求が人生を照らす。旅・学問・思想との縁が深くなりやすい",
      "社会的な役割を通して輝くタイプ。キャリアが自己実現の場になりやすい",
      "仲間とビジョンを分かち合う場で輝く。横のつながりが人生を運びやすい",
      "舞台裏や静けさの中で力を発揮する。内面世界の豊かさが源泉になりやすい",
    ],
    "月": [
      "感情が顔に出やすい素直さ。周囲の空気をまとうように反映しやすい",
      "安心の拠り所は経済的な安定。心地よい物に囲まれると落ち着きやすい",
      "おしゃべりと身近な行き来が心の栄養。気分が言葉に乗りやすい",
      "家が心の充電基地。家族や住まいの状態が気分を左右しやすい",
      "楽しむことで心が回復する。趣味や創作が感情の出口になりやすい",
      "日課が整うと心も整うタイプ。体調と気分が連動しやすい傾向",
      "相手の反応に気持ちが揺れやすい。誰かと共にいることで安定しやすい",
      "感情の結びつきが深く濃い。信頼した相手と心の深部を共有したい傾向",
      "遠くへ心が向かう放浪心。学びや旅が気持ちをリセットしやすい",
      "人前での評価に感情が動きやすい。世話役として頼られやすい傾向",
      "仲間の輪の中で安心するタイプ。グループの感情の受け皿になりやすい",
      "感情を表に出さず内で処理するタイプ。ひとりの時間が不可欠になりやすい",
    ],
    "水星": [
      "話し方がその人の印象を決める。頭の回転の速さが前面に出やすい",
      "実利に結びつく思考力。お金や価値の話に強くなりやすい",
      "情報収集と発信の申し子。書く・話す・学ぶが日常の中心になりやすい",
      "家庭内の会話や記憶が思考の土台。気を許した相手にはよく喋るタイプ",
      "遊び心のある表現力。創作や企画にアイデアが湧きやすい",
      "実務処理能力が高い配置。仕事の段取りと分析で頼られやすい",
      "対話でこそ考えが深まる。交渉や相談の場面で力が出やすい",
      "物事の裏側を調べたくなる探究心。核心を突く質問が得意になりやすい",
      "大きなテーマを学びたがる頭。専門知識や語学と縁ができやすい",
      "知性が仕事の看板になる配置。伝える職能で評価されやすい",
      "仲間との情報交換が刺激源。ネットワークのハブ役になりやすい",
      "頭の中で静かに考えを熟成させる。言葉にする前の内的対話が長い傾向",
    ],
    "金星": [
      "柔らかな魅力が第一印象に出る。好かれやすい雰囲気をまといやすい",
      "美しいもの・心地よいものへの投資を好む。審美眼が実益と結びつきやすい",
      "言葉遣いの柔らかさが魅力。身近な縁に恵まれやすい",
      "住まいを美しく整える才。家庭的な安らぎを大切にしやすい",
      "恋愛と創作の喜びが濃い配置。楽しみ上手で華のある傾向",
      "職場の潤滑油になる人当たり。日々の仕事に美意識が宿りやすい",
      "対人関係の魅力が最大の資産。良縁に恵まれやすい配置",
      "深く濃い親密さを味わう配置。人から託されるものとの縁も深くなりやすい",
      "異文化や遠い土地との良縁。旅先での出会いに恵まれやすい",
      "社会的な場での人望と華。美や調和に関わる仕事と相性がよい傾向",
      "友情に恵まれる配置。仲間内の調整役として愛されやすい",
      "人知れず育つ愛情。見返りを求めない優しさが底にありやすい",
    ],
    "火星": [
      "エネルギーが外見や振る舞いに表れる。押しが強く見られやすい",
      "稼ぐことへの積極性。欲しいものへ一直線に動きやすい",
      "議論や言葉のやり取りで熱くなりやすい。フットワークの軽さが武器",
      "家や身内のことに熱が入りやすい。住まいの改善に力が向きやすい",
      "遊びも恋も全力投球。勝負ごとや創作で燃えやすい",
      "仕事への集中力と処理速度が高い。頑張りすぎる面には注意したい傾向",
      "相手に率直にぶつかっていくスタイル。関係の中で摩擦と情熱が生まれやすい",
      "深い関わりに全力を注ぐ集中力。いざという場面で力が出やすい",
      "遠征型の行動力。信念のためなら遠くまで動きやすい",
      "キャリアへの推進力が強い。目標達成への闘志が社会で発揮されやすい",
      "仲間と一緒に動くと燃えるタイプ。理想の実現へ向けた行動力が出やすい",
      "表に出ない場所で頑張る人。溜めた力がときどき一気に出やすい",
    ],
    "木星": [
      "おおらかで恵まれた印象を与える。存在自体が場を広げやすい",
      "経済面の発展運。稼ぐ・増やす場面でチャンスに恵まれやすい",
      "学びと発信の広がり運。身近な縁が思わぬ展開を運びやすい",
      "家と家族に恵まれる配置。暮らしの土台が大きく育ちやすい",
      "楽しみと創造の拡大運。遊び心が幸運の入り口になりやすい",
      "仕事に恵まれる配置。日々の務めが着実に発展へつながりやすい",
      "パートナー運のよさが持ち味。人との組み合わせで大きく伸びやすい",
      "受け取る運の強さ。人からの信頼や資源に恵まれやすい",
      "探求と遠方の幸運。学び・旅・思想が人生を大きく広げやすい",
      "社会的な発展運。キャリアの節目で引き上げられやすい",
      "仲間と未来への幸運。人脈が夢の実現を後押ししやすい",
      "見えない加護のような運。窮地で助けが入りやすい配置",
    ],
    "土星": [
      "自分への評価が辛口になりがち。年齢とともに風格に変わりやすい",
      "お金への慎重さと不安が同居。堅実な管理力が育ちやすい",
      "学びへの苦手意識が努力で強みになる。言葉に重みが出やすい",
      "家や家族に責任を感じやすい。時間をかけて安心の土台を築く傾向",
      "楽しむことへの照れや抑制。本気の創作ほど時間をかけて実りやすい",
      "仕事の完成度への厳しさ。体調管理が課題であり強みになりやすい",
      "関係への責任感が強い。時間をかけた信頼関係ほど堅固になりやすい",
      "深く委ねることへの慎重さ。他者に任せる練習が課題になりやすい",
      "信じることを疑いながら鍛えるタイプ。学びの完成に時間をかける傾向",
      "キャリアへの重い責任感。努力の積み上げが晩成の実りになりやすい",
      "集団に馴染むまで時間がかかる傾向。少数の堅い友情を育てやすい",
      "見えない不安を抱え込みやすい。内面の規律が精神的な強さになりやすい",
    ],
    "天王星": [
      "型にはまらない個性が第一印象に出やすい。独自路線の人",
      "収入源や価値観がユニーク。お金の流れも独特になりやすい",
      "発想と言葉が独創的。学び方も我流になりやすい",
      "家や家族の形が標準にとらわれない。住環境の変化が多くなりやすい",
      "遊びと創作が前衛的。恋愛も型破りになりやすい",
      "働き方の自由を求めるタイプ。独自の仕事スタイルを作りやすい",
      "関係に自由と刺激を求める。型どおりでないパートナーシップになりやすい",
      "価値観の根本を揺さぶられる経験と縁がある。突然の変化に強くなりやすい",
      "思想の自由人。独学や型破りな学びに惹かれやすい",
      "キャリアの急展開が起きやすい。独立や革新的な分野と縁ができやすい",
      "個性的な仲間と集まる傾向。未来的な活動に関わりやすい",
      "内面世界の独自性。直感の閃きが人知れず働きやすい",
    ],
    "海王星": [
      "掴みどころのない透明な雰囲気。相手によって印象が変わりやすい",
      "お金の輪郭が曖昧になりやすい。かたちのない価値を扱う才が出やすい",
      "詩的な言葉の感性。事実より印象で受け取りやすい傾向",
      "家に理想と郷愁を重ねやすい。家庭に癒しの空気が流れやすい",
      "創作に夢が宿る配置。ロマンチックな恋に惹かれやすい",
      "仕事に献身しやすいタイプ。体調は環境の空気に影響されやすい傾向",
      "相手を理想化しやすい。境界のやわらかい優しい関係になりやすい",
      "深層の世界への感受性。目に見えない結びつきを感じやすい",
      "精神世界への探求心。思想や霊性の学びと縁ができやすい",
      "職業イメージが夢や癒しと結びつく。肩書きが一つに定まりにくい面も",
      "理想を共有する仲間との縁。グループへの献身が出やすい",
      "想像力と共感の最深部。夢見る力が強く、ひとりの時間で開きやすい",
    ],
    "冥王星": [
      "静かな迫力をまとう存在感。人生の節目で自己像が大きく変わりやすい",
      "所有への強い集中と手放しの経験。経済面の再生力が強い傾向",
      "言葉に力が宿る配置。調べ始めると徹底的になりやすい",
      "家族の深いテーマと向き合いやすい。土台の作り直しを経験しやすい",
      "創作と恋愛に全存在を賭けやすい。表現をめぐる変容を経やすい",
      "仕事への没入が極まりやすい。働き方の根本的な立て直しを経験しやすい",
      "関係が人生を変える配置。深く結びつき、深く変容しやすい",
      "変容のハウスの主のような配置。節目を越えるたび強くなる再生力が出やすい",
      "信念の根本的な更新を経験しやすい。思想への没入が深い傾向",
      "社会的役割での大きな変容。影響力のテーマと向き合いやすい",
      "集団との関わりで生まれ変わるタイプ。仲間関係の深い入れ替わりを経やすい",
      "無意識の深部との対話。人知れぬ再生のプロセスが働きやすい",
    ],
  };

  // ドラゴンヘッド × サイン（今生で伸ばしていく方向。サイン順: 牡羊→魚）
  const NODE_SIGN = [
    "人に合わせる前に、まず自分で決めて動く経験を増やす方向",
    "急がず、自分の五感と実感を頼りに積み上げていく方向",
    "答えを決めつけず、軽やかに学び、言葉で人とつながる方向",
    "達成よりも、安心できる居場所と情のつながりを育てる方向",
    "みんなの一人から一歩出て、自分の名前で表現していく方向",
    "夢を漂わせず、日々の実務と体調を整えて形にしていく方向",
    "単独行動のクセをゆるめ、対等な協力関係を育てていく方向",
    "自力で抱え込まず、人と深く関わり資源を分かち合う方向",
    "身近な情報の海から出て、大きな意味と遠い世界を探す方向",
    "身内の世話にとどまらず、社会の中で役割を引き受ける方向",
    "主役でいることより、仲間と未来をつくる側に回っていく方向",
    "分析と管理を少し手放し、流れと直感に委ねてみる方向",
  ];

  // ドラゴンヘッド × ハウス（1〜12H）
  const NODE_HOUSE = [
    "自分自身のあり方・押し出し方を育てる場面で成長しやすい",
    "自前の稼ぎと才能を育てることが今生のテーマになりやすい",
    "学ぶ・伝える・身近な縁を結ぶ場面に伸びしろがありやすい",
    "家と心の土台を自分の手でつくることが成長の軸になりやすい",
    "遊びと創作、自分発の表現に踏み出すほど育ちやすい",
    "日々の仕事と暮らしの整えの中に成長の入口がありやすい",
    "一対一の関係に腰を据えることが今生の学びになりやすい",
    "人と深く組み、受け取り、託されることが成長の道になりやすい",
    "遠出・専門探求・思想の旅が人生を押し広げやすい",
    "社会的な役割や肩書きを引き受ける場面で育ちやすい",
    "仲間・ネットワーク・未来のビジョンの側に伸びしろがある",
    "静けさと内面世界に向き合うことが今生の熟成になりやすい",
  ];

  // 数秘: ライフパスナンバー（生年月日のみ・名前は使わない）
  const LIFE_PATH_TEXT = {
    1: "自分で始め、自分で決める開拓の数。人に頼るより先頭に立つほど、本来の力が出やすいタイプです",
    2: "支え、つなぎ、調和させる数。競うより寄り添う場面で持ち味が生き、細やかな感受性が力になりやすい",
    3: "表現と楽しさの数。話す・つくる・場を明るくすることが役割になりやすく、遊び心が運を運びやすい",
    4: "土台を築く数。地道な継続と仕組みづくりが得意で、信頼の積み上げがそのまま財産になりやすい",
    5: "変化と自由の数。ひとつの場所に収まらず、移動・冒険・多彩な経験が人生の栄養になりやすい",
    6: "愛情と責任の数。家族や身近な人の世話役を引き受けやすく、美と調和を整える力が持ち味になりやすい",
    7: "探求と内省の数。表面より本質を掘り下げたい人で、ひとりの時間が知恵の源泉になりやすい",
    8: "実現と手腕の数。組織・お金・実務を動かす力があり、大きな目標ほど本領を発揮しやすい",
    9: "包容と完結の数。立場を超えて人を受け入れる広さがあり、手放すことで次の扉が開きやすい",
    11: "直感とひらめきのマスターナンバー。感受性が鋭く、受け取ったものを人に伝える橋渡し役になりやすい",
    22: "大きな構想を現実に建てるマスターナンバー。理想を形にする実務力と規模感を併せ持ちやすい",
    33: "無条件の愛と献身のマスターナンバー。損得を超えて人を育て、癒す場面で深い力が出やすい",
  };

  // 数秘: バースデーナンバー（日にちのみ）
  const BIRTHDAY_TEXT = {
    1: "自分から動き出す日。率先と独立心が持ち味になりやすい",
    2: "人と呼吸を合わせる日。気配りと協調が自然に出やすい",
    3: "明るさと表現の日。場をなごませる才が出やすい",
    4: "コツコツ型の日。着実さと段取り力が持ち味になりやすい",
    5: "変化を楽しむ日。フットワークと適応力が出やすい",
    6: "面倒見の日。世話役の姿勢と美意識が自然に備わりやすい",
    7: "考える人の日。観察力と独自の視点が出やすい",
    8: "実行力の日。目標へ向かう腕力と粘りが出やすい",
    9: "広い心の日。誰にでも開かれた包容力が出やすい",
    11: "感受性の鋭い日。直感とインスピレーションが働きやすい",
    22: "大きな器の日。現実を組み立てるスケール感が出やすい",
  };

  // 進行月 × サイン（いまの感情の季節。サイン順: 牡羊→魚）
  const PROG_MOON_SIGN = [
    "新しく始めたい衝動が湧く季節。感情の立ち上がりが速くなりやすい",
    "腰を落ち着けて味わう季節。心地よさと安定を求めやすい",
    "好奇心がそわそわ動く季節。会話と情報が心の栄養になりやすい",
    "身内と居場所に心が向かう季節。守りたい気持ちが強まりやすい",
    "気持ちが表に出たがる季節。認められる喜びが原動力になりやすい",
    "暮らしを整えたくなる季節。細部が気になり、調整が進みやすい",
    "人との関わりに心が開く季節。バランスと美しさを求めやすい",
    "感情が深く潜る季節。本音とじっくり向き合いやすい",
    "遠くへ行きたくなる季節。楽観と学びの意欲が高まりやすい",
    "役割と成果に気持ちが向かう季節。感情より責任が前に出やすい",
    "少し距離をとって眺めたくなる季節。自由と新しい風を求めやすい",
    "境界がやわらかくなる季節。感受性が深まり、休息が効きやすい",
  ];

  // 天体の「はたらき」名詞（アスペクト文で使用）
  const PLANET_ESSENCE = {
    "太陽": "生きる方向性", "月": "素の感情", "水星": "思考と言葉", "金星": "愛し方と美意識",
    "火星": "行動力", "木星": "広げる力", "土星": "律する力", "天王星": "変革の衝動",
    "海王星": "想像力", "冥王星": "変容の力",
  };

  const ASPECT_TEXT = {
    "合": (a, b) => `${a}の${PLANET_ESSENCE[a]}と${b}の${PLANET_ESSENCE[b]}が重なり、一体となって強く働きやすい組み合わせ`,
    "衝": (a, b) => `${a}の${PLANET_ESSENCE[a]}と${b}の${PLANET_ESSENCE[b]}が向かい合う配置。振り子のように揺れながら、両方を活かすバランスを探しやすい`,
    "トライン": (a, b) => `${a}の${PLANET_ESSENCE[a]}と${b}の${PLANET_ESSENCE[b]}が自然に調和し、意識しなくても滑らかに働きやすい`,
    "スクエア": (a, b) => `${a}の${PLANET_ESSENCE[a]}と${b}の${PLANET_ESSENCE[b]}の間に張りがあり、乗り越えるたびバネのような力に変わりやすい`,
    "セクスタイル": (a, b) => `${a}の${PLANET_ESSENCE[a]}と${b}の${PLANET_ESSENCE[b]}は相性がよく、意識して使うほど伸びやすい組み合わせ`,
  };

  const ELEMENT_STRONG = {
    "火": "直感と勢いで動くエネルギーが強め。まず動いてみることで道を見つけやすい人です",
    "地": "現実感覚と着実さが強め。手で触れられる形にすることを大切にする人です",
    "風": "考えることと伝えることのエネルギーが強め。会話と情報の風通しが元気の源になりやすい人です",
    "水": "感じ取る力と共感のエネルギーが強め。理屈より心の動きで世界を捉えやすい人です",
  };
  const ELEMENT_WEAK = {
    "火": "勢いで押し切るのは得意ではないかもしれません。始動には外からのきっかけが役立ちやすい傾向",
    "地": "現実的な段取りや継続は意識して補うタイプかもしれません。形にする作業は誰かと組むとよさそう",
    "風": "言葉での説明や理屈の整理は後回しになりやすいかもしれません。感覚を言語化する手助けが喜ばれやすい傾向",
    "水": "感情表現は控えめかもしれません。ドライに見えても、気持ちがないわけではない点は知っておきたいところ",
  };
  const MODALITY_TEXT = {
    "活動宮": "自分から状況を動かし始める力が強め。立ち上げやきっかけづくりが得意な傾向",
    "不動宮": "一度決めたことを持続させる力が強め。ブレにくく、じっくり深める傾向",
    "柔軟宮": "状況に合わせて形を変える適応力が強め。変化の波に乗るのが得意な傾向",
  };

  // ========== ユーティリティ ==========

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return h;
  }
  function pick(arr, seed) { return arr[seed % arr.length]; }

  function signIdx(signJa) { return SIGNS.indexOf(signJa); }

  function planetByJa(chart, ja) { return chart.planets.find((p) => p.ja === ja); }

  function sabianText(absDeg) {
    const s = SABIAN[absDeg];
    if (!s) return "";
    return s.ja || s.en;
  }

  // ========== 分析層 ==========

  function analyze(chart) {
    // エレメント・クオリティバランス（太陽・月は2倍。ASCも2倍で加算）
    const elemCount = { 火: 0, 地: 0, 風: 0, 水: 0 };
    const modCount = { 活動宮: 0, 不動宮: 0, 柔軟宮: 0 };
    for (const p of chart.planets) {
      const w = (p.ja === "太陽" || p.ja === "月") ? 2 : 1;
      elemCount[ELEMENT_OF[p.signJa]] += w;
      modCount[MODALITY_OF[p.signJa]] += w;
    }
    elemCount[ELEMENT_OF[chart.asc.signJa]] += 2;
    modCount[MODALITY_OF[chart.asc.signJa]] += 2;

    const elemSorted = Object.entries(elemCount).sort((a, b) => b[1] - a[1]);
    const modSorted = Object.entries(modCount).sort((a, b) => b[1] - a[1]);

    // ステリウム（同一サイン or 同一ハウスに3天体以上）
    const bySign = {}, byHouse = {};
    for (const p of chart.planets) {
      (bySign[p.signJa] = bySign[p.signJa] || []).push(p.ja);
      (byHouse[p.house] = byHouse[p.house] || []).push(p.ja);
    }
    const stelliumSigns = Object.entries(bySign).filter(([, v]) => v.length >= 3);
    const stelliumHouses = Object.entries(byHouse).filter(([, v]) => v.length >= 3);

    // アンギュラー天体（ASC/MC と合 8度以内）
    const angular = [];
    for (const p of chart.planets) {
      const dAsc = Math.abs(((p.lon - chart.asc.lon + 540) % 360) - 180);
      const dMc = Math.abs(((p.lon - chart.mc.lon + 540) % 360) - 180);
      if (dAsc <= 8) angular.push({ planet: p.ja, point: "ASC" });
      if (dMc <= 8) angular.push({ planet: p.ja, point: "MC" });
    }

    // チャートルーラー
    const rulerName = RULER_OF[chart.asc.signJa];
    const ruler = planetByJa(chart, rulerName) || null;

    return {
      elemCount, modCount,
      strongestElem: elemSorted[0][0], weakestElem: elemSorted[3][0],
      weakestElemCount: elemSorted[3][1],
      strongestMod: modSorted[0][0],
      stelliumSigns, stelliumHouses, angular,
      rulerName, ruler,
    };
  }

  function buildSabianTable(chart) {
    const rows = chart.planets.map((p) => {
      const s = SABIAN[p.absSabian];
      const label = s ? (s.ja || s.en) : "";
      return `| ${p.ja}${p.retrograde ? " R" : ""} | ${p.signJa}${p.sabianDeg}度 | ${p.house}H | ${label} |`;
    });
    const ascS = SABIAN[chart.asc.absSabian];
    const mcS = SABIAN[chart.mc.absSabian];
    rows.push(`| ASC | ${chart.asc.signJa}${chart.asc.sabianDeg}度 | — | ${ascS ? (ascS.ja || ascS.en) : ""} |`);
    rows.push(`| MC | ${chart.mc.signJa}${chart.mc.sabianDeg}度 | — | ${mcS ? (mcS.ja || mcS.en) : ""} |`);
    return "| 天体 | サイン・度数 | ハウス | サビアンシンボル |\n|---|---|---|---|\n" + rows.join("\n");
  }


  // ========== 数秘（誕生数秘術・生年月日のみ） ==========

  function digitSum(n) {
    return String(n).split("").reduce((a, c) => a + Number(c), 0);
  }

  // マスターナンバーを保持しながら還元。stepsに計算過程を残す
  function reduceNumber(n, masters, steps) {
    while (n > 9 && !masters.includes(n)) {
      const s = digitSum(n);
      steps.push(`${String(n).split("").join("+")}=${s}`);
      n = s;
    }
    return n;
  }

  function numerology(dateStr) {
    const digits = dateStr.replace(/-/g, "").split("").map(Number);
    const total = digits.reduce((a, b) => a + b, 0);
    const lifeSteps = [`${digits.join("+")}=${total}`];
    const lifePath = reduceNumber(total, [11, 22, 33], lifeSteps);

    const day = Number(dateStr.slice(8, 10));
    const bdSteps = [];
    const birthday = day > 9 ? reduceNumber(day, [11, 22], bdSteps) : day;
    const bdCalc = bdSteps.length ? `${day}日生まれ → ${bdSteps.join(" → ")}` : `${day}日生まれ → ${birthday}`;

    return {
      lifePath, birthday,
      lifeCalc: lifeSteps.join(" → "),
      birthdayCalc: bdCalc,
      isMasterLife: [11, 22, 33].includes(lifePath),
      isMasterBirthday: [11, 22].includes(birthday),
    };
  }


  // Claude深読み用プロンプト
  // ルーラーの連鎖（ディスポジターチェーン）: ASCの支配星から辿る
  function dispositorChain(chart) {
    const bySign = {};
    for (const p of chart.planets) bySign[p.ja] = p;
    const steps = [];
    const visited = new Set();
    let cur = RULER_OF[chart.asc.signJa];
    steps.push(`${chart.asc.signJa}ASC`);
    while (cur && !visited.has(cur)) {
      visited.add(cur);
      const p = bySign[cur];
      if (!p) break;
      steps.push(`${cur}（${p.signJa}${p.house}H${p.retrograde ? "・逆行" : ""}）`);
      const next = RULER_OF[p.signJa];
      if (next === cur) { steps.push("→ 自分のサインで終着（この天体が芯）"); break; }
      cur = next;
    }
    if (cur && visited.has(cur)) steps.push(`→ ${cur} へ戻るループ（この循環が芯）`);
    return steps.join(" → ").replace(" → → ", " → ");
  }

  // 相互リセプション: 互いのサインの支配星同士
  function mutualReceptions(chart) {
    const out = [];
    const ps = chart.planets;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        if (RULER_OF[ps[i].signJa] === ps[j].ja && RULER_OF[ps[j].signJa] === ps[i].ja) {
          out.push(`${ps[i].ja}（${ps[i].signJa}）⇄ ${ps[j].ja}（${ps[j].signJa}）`);
        }
      }
    }
    return out;
  }

  const ODD_SIGNS = new Set(["牡羊座", "双子座", "獅子座", "天秤座", "射手座", "水瓶座"]);


  // ========== 統合リーディング・パイプライン ==========
  // Layer1 buildEvidence（全シグナルの正規化）→ Layer2 buildPersonThemes（15テーマ集約）
  // → Layer3 buildCoreReading（核の抽出）→ Layer4 buildManual（14章の取扱説明書）

  const THEME_JA = {
    selfImage: "自己認識", emotion: "感情", action: "行動", relating: "対人",
    work: "仕事", money: "お金", creativity: "創造性", safety: "安全欲求",
    control: "支配と委任", continuity: "継続と変化", socialRole: "社会的役割",
    repetition: "人生の反復", oldStrategy: "古い生存戦略", growth: "新しい成長方向",
    currentSeason: "現在の内的サイクル",
  };
  const THEME_IDS = Object.keys(THEME_JA);

  const PLANET_THEMES = {
    "太陽": ["selfImage"], "月": ["emotion", "safety"], "水星": ["action", "relating"],
    "金星": ["relating", "creativity"], "火星": ["action"], "木星": ["growth", "socialRole"],
    "土星": ["control", "repetition"], "天王星": ["continuity"], "海王星": ["creativity", "safety"],
    "冥王星": ["control", "repetition"],
  };
  const HOUSE_THEMES = {
    1: ["selfImage"], 2: ["money"], 3: ["relating"], 4: ["safety"], 5: ["creativity"],
    6: ["work"], 7: ["relating"], 8: ["control"], 9: ["growth"], 10: ["socialRole", "work"],
    11: ["socialRole"], 12: ["emotion"],
  };

  // 矛盾（引っぱり合い）検出用の軸タグ
  const FREEDOM_SIGNS = new Set(["牡羊座", "双子座", "射手座", "水瓶座"]);
  const STABILITY_SIGNS = new Set(["牡牛座", "蟹座", "乙女座", "山羊座"]);
  function axisOfSign(signJa) {
    if (FREEDOM_SIGNS.has(signJa)) return "自由";
    if (STABILITY_SIGNS.has(signJa)) return "安定";
    return null;
  }

  // サイン別: 中心の才能と、その同じ力が過剰になったときの姿（長所と弱点は表裏一体）
  const SIGN_GIFT = {
    "牡羊座": "迷いを断ってまず動き、道を切り拓く力",
    "牡牛座": "一度決めたことを腰を据えて続け、形に残す力",
    "双子座": "情報と人を軽やかにつなぎ、風通しをつくる力",
    "蟹座": "身近な人の機微を感じ取り、守り育てる力",
    "獅子座": "場を立ち上げ、人を惹きつけて照らす力",
    "乙女座": "細部を整え、物事を実際に回る形に落とす力",
    "天秤座": "立場の違う人の間に立ち、場を調える力",
    "蠍座": "一つの対象に深く潜り、最後までやり抜く力",
    "射手座": "遠くの目標に照準を合わせ、視野を広げていく力",
    "山羊座": "責任を引き受け、時間をかけて積み上げる力",
    "水瓶座": "常識の外側から発想し、新しい形を持ち込む力",
    "魚座": "境界を越えて共感し、人と場を包み込む力",
  };
  const SIGN_RISK = {
    "牡羊座": "勢いが先行して、周囲や段取りを置き去りにしやすくなります",
    "牡牛座": "変化への腰が重くなり、好機を見送りやすくなります",
    "双子座": "興味が分散して、一つを深める前に次へ移りやすくなります",
    "蟹座": "身内の輪の外に壁ができて、守りが閉じこもりに変わりやすくなります",
    "獅子座": "認められない場面で急に火が消え、投げ出したくなりやすくなります",
    "乙女座": "完璧を求めて、自分にも人にも採点が厳しくなりやすくなります",
    "天秤座": "相手に合わせすぎて、自分の本音が行方不明になりやすくなります",
    "蠍座": "抱え込みと執着が強まり、手放しどきを逃しやすくなります",
    "射手座": "足元の詰めが粗くなり、始めたことが散らかりやすくなります",
    "山羊座": "背負いすぎて、弱音を出す場所がなくなりやすくなります",
    "水瓶座": "人と距離を取りすぎて、理解される前に孤立しやすくなります",
    "魚座": "流されて自分の輪郭がぼやけ、疲れの原因が見えなくなりやすくなります",
  };

  // ドラゴンヘッド方向の短い動詞句（サイン順: 牡羊→魚）
  const NODE_SHORT = [
    "人に合わせる前に自分で決めて動く", "急がず実感を頼りに積み上げる",
    "軽やかに学び、言葉で人とつながる", "安心できる居場所と情のつながりを育てる",
    "自分の名前で表現していく", "日々の実務と暮らしを整えて形にする",
    "対等な協力関係を育てる", "人と深く組み、資源を分かち合う",
    "大きな意味と遠い世界を探しにいく", "社会の中で役割を引き受ける",
    "仲間と未来をつくる側に回る", "分析を少し手放し、流れと直感に委ねる",
  ];

  // 基本OS: 反応の順番（優勢エレメント別）
  const ELEMENT_ORDER_TEXT = {
    "火": "考えが完全にまとまるのを待ってから動く人ではありません。身体や直感が先に反応し、動き始めたあとで頭が意味を組み立てる順番です",
    "地": "頭より先に「現実に成り立つか」を身体感覚で確かめる人です。手応えの確認が済んでから動き、いったん動き出すと簡単には止まりません",
    "風": "何よりも先に頭が動きます。状況を言葉と情報に置き換えて整理し、自分なりの説明がついた瞬間に行動のスイッチが入る順番です",
    "水": "最初に動くのは気持ちです。場の空気と感情の納得が先にあり、理屈はあとから追いつきます。心が「否」と言っている話は、条件がよくても前に進みにくいはずです",
  };
  const MODALITY_DECISION = {
    "活動宮": "判断の物差しは「いま動けば状況を変えられるか」。止まっている状態そのものがストレスになりやすく、決断は早いほうです",
    "不動宮": "判断の物差しは「腰を据えて続ける価値があるか」。決めるまでは慎重ですが、一度決めたら簡単には覆しません",
    "柔軟宮": "判断の物差しは「状況に合わせて形を変えられるか」。決め打ちより選択肢を残す判断を好み、途中修正が得意です",
  };
  const MOON_CRISIS = {
    "火": "不意打ちの危機では、考えるより先に動いて打開しようとします。何もできず待たされる状況が、いちばんの消耗になりやすいでしょう",
    "地": "不意打ちの危機では、いったん固まって様子を見ます。確実にできる小さな一手が見つかると、そこから立て直しが始まります",
    "風": "不意打ちの危機では、まず状況を言葉にしようとします。誰かに話して整理できると、落ち着きを取り戻しやすい人です",
    "水": "不意打ちの危機では、まず感情が大きく波立ちます。その場で判断せず、気持ちが静まる場所と時間を確保するのが先決です",
  };
  const MOON_HURT = {
    "火": "「落ち着いて」「まだ早い」——勢いそのものを止められる言葉",
    "地": "「考えすぎ」「融通が利かない」——積み上げてきた慎重さを軽んじられる言葉",
    "風": "「理屈っぽい」「口だけ」——関心と言葉そのものを否定される言葉",
    "水": "「気にしすぎ」「重い」——感じ方そのものを否定される言葉",
  };
  const MOON_WANT = {
    "火": "「いいね、やってみよう」と背中を押してくれる言葉",
    "地": "「ちゃんと見ているよ」と積み上げを認めてくれる言葉",
    "風": "「その話、もっと聞かせて」と関心に応えてくれる言葉",
    "水": "「その気持ち、わかるよ」と、まず受け止めてくれる言葉",
  };
  const MOON_RECOVERY = {
    "火": "身体を動かして熱を外に出す（歩く・運動・作業）",
    "地": "五感を満たす（おいしいもの・手触りのよいもの・自然の中）",
    "風": "気の置けない相手と話して、頭の中を換気する",
    "水": "ひとりの時間と、水や湯に触れる時間（湯船・水辺）で感情を流す",
  };
  const ELEM_OVERRUN = {
    "火": "考える前に着火してしまい、撤退の判断が遅れる",
    "地": "確実さにこだわりすぎて、変化のタイミングを逃す",
    "風": "言葉が先行して、気持ちの温度が置き去りになる",
    "水": "感じ取りすぎて、他人の課題まで背負い込む",
  };
  const MOD_ROLE = {
    "活動宮": { best: "0→1の立ち上げ役。何もないところに最初の形をつくる場面", avoid: "完成した仕組みを、変えずに回し続けるだけの持ち場" },
    "不動宮": { best: "1→10に育てる役。始まったものを深め、守り、看板に育てる場面", avoid: "方針が頻繁に変わり、積み上げが毎回リセットされる持ち場" },
    "柔軟宮": { best: "接続と調整の役。人・案件・部署の間をつなぎ直し、変化に合わせて形を変える場面", avoid: "一つのやり方だけを長期間固定される持ち場" },
  };
  const ELEM_ROLE = {
    "火": "現場で先頭に立ち、勢いを起こす役割",
    "地": "構想を運用と実務に落とし、続く形にする役割",
    "風": "言語化と情報整理で、ばらばらな動きを翻訳してつなぐ役割",
    "水": "人の機微と場の空気を扱い、チームの信頼をつくる役割",
  };
  const MOON_MONEY_PURPOSE = {
    "火": "すぐ動ける自由を確保するため",
    "地": "足場と安心を確保するため",
    "風": "選択肢と身軽さを保つため",
    "水": "大切な人と居場所を守るため",
  };
  const PROG_SEASON = {
    "活動宮": "新しく始める時期", "不動宮": "始まったものを育てる時期", "柔軟宮": "手放して整理する時期",
  };

  // ---------- Layer 1: buildEvidence ----------

  function buildEvidence(chart, prog) {
    const a = analyze(chart);
    const ev = [];
    const push = (o) => { if (o && o.themes && o.themes.length) ev.push(o); };
    const angularSet = new Set(a.angular.map((x) => x.planet));

    // 各天体 サイン×ハウス
    for (const p of chart.planets) {
      let strength = ["太陽", "月", "水星", "金星", "火星"].includes(p.ja) ? 3 : 2;
      if (angularSet.has(p.ja)) strength += 1;
      if (RULER_OF[p.signJa] === p.ja) strength += 1; // 品位（自分のサイン）
      if (a.rulerName === p.ja) strength += 1;        // チャートルーラー
      strength = Math.min(5, strength);
      push({
        sourceType: "natal", sourceLabel: `${p.ja}${p.signJa}${p.house}H`,
        themes: [...new Set([...(PLANET_THEMES[p.ja] || []), ...(HOUSE_THEMES[p.house] || [])])],
        note: PLANET_SIGN[p.ja][p.signIndex], houseNote: PLANET_HOUSE[p.ja][p.house - 1],
        strength, confidence: 0.9, axis: axisOfSign(p.signJa),
        planet: p.ja, sign: p.signJa, house: p.house, retrograde: p.retrograde,
      });
    }

    // ASC / MC / DSC
    push({ sourceType: "natal", sourceLabel: `ASC${chart.asc.signJa}`, themes: ["selfImage", "relating"],
      note: `第一印象は「${SIGN_KEYWORDS[chart.asc.signJa]}」の空気をまといやすい`,
      strength: 4, confidence: 0.9, axis: axisOfSign(chart.asc.signJa), sign: chart.asc.signJa });
    push({ sourceType: "natal", sourceLabel: `MC${chart.mc.signJa}`, themes: ["socialRole", "work"],
      note: `社会の中で目指す姿に「${SIGN_KEYWORDS[chart.mc.signJa]}」の色が乗りやすい`,
      strength: 3, confidence: 0.8, sign: chart.mc.signJa });
    push({ sourceType: "natal", sourceLabel: `DSC${chart.dsc.signJa}`, themes: ["relating"],
      note: `一対一では「${SIGN_KEYWORDS[chart.dsc.signJa]}」の質を持つ相手や関わり方に引き寄せられやすい`,
      strength: 3, confidence: 0.8, sign: chart.dsc.signJa });

    // エレメント・モダリティのバランス（太陽・月・ASC 2倍換算は analyze() 内で処理済み）
    push({ sourceType: "structure", sourceLabel: `エレメント重心=${a.strongestElem}`,
      themes: ["action", "emotion"], note: ELEMENT_STRONG[a.strongestElem],
      strength: 4, confidence: 0.9, elem: a.strongestElem });
    if (a.weakestElemCount <= 1) {
      push({ sourceType: "structure", sourceLabel: `${a.weakestElem}のエレメントが薄い`,
        themes: ["action", "emotion"], note: ELEMENT_WEAK[a.weakestElem],
        strength: 3, confidence: 0.8, elem: a.weakestElem });
    }
    push({ sourceType: "structure", sourceLabel: `${a.strongestMod}が優勢`,
      themes: ["action", "continuity"], note: MODALITY_TEXT[a.strongestMod],
      strength: 4, confidence: 0.9 });

    // ステリウム
    for (const [sign, ps] of a.stelliumSigns) {
      const themes = new Set();
      for (const pj of ps) (PLANET_THEMES[pj] || []).forEach((t) => themes.add(t));
      themes.add("repetition");
      push({ sourceType: "structure", sourceLabel: `${sign}ステリウム（${ps.join("・")}）`,
        themes: [...themes], note: `「${SIGN_KEYWORDS[sign]}」のテーマが、人生の中で繰り返し鳴る主旋律になりやすい`,
        strength: 5, confidence: 0.9, axis: axisOfSign(sign), sign });
    }
    for (const [house, ps] of a.stelliumHouses) {
      push({ sourceType: "house", sourceLabel: `${house}Hステリウム（${ps.join("・")}）`,
        themes: [...new Set([...(HOUSE_THEMES[house] || []), "repetition"])],
        note: `人生のエネルギーの多くが「${HOUSE_THEME[house]}」の領域に注がれやすい`,
        strength: 5, confidence: 0.9, house: Number(house) });
    }

    // アンギュラー天体
    for (const ang of a.angular) {
      push({ sourceType: "structure", sourceLabel: `${ang.planet}が${ang.point}付近`,
        themes: [...new Set([...(PLANET_THEMES[ang.planet] || []), ang.point === "ASC" ? "selfImage" : "socialRole"])],
        note: `${PLANET_ESSENCE[ang.planet]}が人物像の前面に出やすい`,
        strength: 4, confidence: 0.85, planet: ang.planet });
    }

    // チャートルーラー
    if (a.ruler) {
      push({ sourceType: "structure", sourceLabel: `チャートルーラー${a.rulerName}（${a.ruler.signJa}${a.ruler.house}H）`,
        themes: [...new Set(["selfImage", ...(HOUSE_THEMES[a.ruler.house] || [])])],
        note: `この人らしさの鍵は「${HOUSE_THEME[a.ruler.house]}」の過ごし方に表れやすい`,
        strength: 4, confidence: 0.85, planet: a.rulerName, house: a.ruler.house });
    }

    // 相互リセプション（2天体が互いのサインの支配星＝永久循環。最重要級）
    for (const pair of mutualReceptionPairs(chart)) {
      push({ sourceType: "structure",
        sourceLabel: `相互リセプション ${pair.a.ja}（${pair.a.signJa}）⇄${pair.b.ja}（${pair.b.signJa}）`,
        themes: [...new Set([...(PLANET_THEMES[pair.a.ja] || []), ...(PLANET_THEMES[pair.b.ja] || []), "selfImage"])],
        note: `${pair.a.ja}の${PLANET_ESSENCE[pair.a.ja]}と${pair.b.ja}の${PLANET_ESSENCE[pair.b.ja]}が互いの家に住み合い、支え合う永久循環。この二つが同時に動くとき、この人の芯が最もよく働く`,
        strength: 5, confidence: 0.85, planets: [pair.a.ja, pair.b.ja] });
    }

    // ディスポジターチェーンの終着（芯の天体）
    const chainEnd = dispositorChainEnd(chart);
    if (chainEnd) {
      push({ sourceType: "structure", sourceLabel: `ルーラーの連鎖の芯=${chainEnd.ja}（${chainEnd.signJa}${chainEnd.house}H）`,
        themes: [...new Set([...(PLANET_THEMES[chainEnd.ja] || []), "selfImage"])],
        note: `チャート全体のエネルギーが、最終的に${chainEnd.ja}（${PLANET_ESSENCE[chainEnd.ja]}）へ流れ込んでいく形`,
        strength: 4, confidence: 0.8, planet: chainEnd.ja });
    }

    // アスペクト
    for (const asp of chart.aspects) {
      const heavy = ["土星", "冥王星", "天王星", "海王星"];
      const hard = asp.type === "スクエア" || asp.type === "衝" ||
        (asp.type === "合" && (heavy.includes(asp.a) || heavy.includes(asp.b)));
      const strength = asp.orb <= 1 ? 5 : asp.orb <= 3 ? 4 : 3;
      const themes = new Set([...(PLANET_THEMES[asp.a] || []), ...(PLANET_THEMES[asp.b] || [])]);
      if (hard && ["土星", "冥王星", "月"].some((x) => x === asp.a || x === asp.b)) {
        themes.add("repetition");
        if (strength >= 4) themes.add("oldStrategy");
      }
      push({ sourceType: "aspect", sourceLabel: `${asp.a}×${asp.b}${asp.type}`,
        themes: [...themes], note: ASPECT_TEXT[asp.type](asp.a, asp.b),
        strength, confidence: 0.85, hard, orb: asp.orb, planets: [asp.a, asp.b], aspType: asp.type });
    }

    // ドラゴンヘッド／テイル
    const n = chart.node, t = chart.tail;
    push({ sourceType: "northNode", sourceLabel: `ヘッド${n.signJa}${n.house}H`,
      themes: ["growth"], note: `${NODE_SIGN[n.signIndex]}。${NODE_HOUSE[n.house - 1]}`,
      strength: 4, confidence: 0.8, sign: n.signJa, house: n.house });
    push({ sourceType: "southNode", sourceLabel: `テイル${t.signJa}${t.house}H`,
      themes: ["oldStrategy", "repetition"],
      note: `「${SIGN_KEYWORDS[t.signJa]}」の質と「${HOUSE_THEME[t.house]}」の領域は、生まれつき手に馴染んだ、迷ったとき自然と戻る場所`,
      strength: 4, confidence: 0.8, sign: t.signJa, house: t.house });

    // 数秘（生年月日のみ）
    const num = numerology(chart.input.dateStr);
    push({ sourceType: "numerology", sourceLabel: `数秘${num.lifePath}`,
      themes: ["selfImage", "repetition"], note: LIFE_PATH_TEXT[num.lifePath],
      strength: 3, confidence: 0.7, number: num.lifePath });
    push({ sourceType: "numerology", sourceLabel: `誕生日数${num.birthday}`,
      themes: ["selfImage"], note: BIRTHDAY_TEXT[num.birthday],
      strength: 2, confidence: 0.6, number: num.birthday });

    // プログレス（二次進行）
    if (prog) {
      const pSun = prog.planets.find((p) => p.ja === "太陽");
      const pMoon = prog.planets.find((p) => p.ja === "月");
      push({ sourceType: "progression", sourceLabel: `進行太陽${pSun.signJa}`,
        themes: ["currentSeason"], note: `いまの人生の章のトーンに「${SIGN_KEYWORDS[pSun.signJa]}」の質が流れ込みやすい`,
        strength: 3, confidence: 0.75, sign: pSun.signJa, prog: "sun" });
      push({ sourceType: "progression", sourceLabel: `進行月${pMoon.signJa}`,
        themes: ["currentSeason"], note: PROG_MOON_SIGN[pMoon.signIndex],
        strength: 3, confidence: 0.75, sign: pMoon.signJa, prog: "moon" });
      for (const pp of prog.planets) {
        const natal = chart.planets.find((p) => p.ja === pp.ja);
        if (natal && natal.signJa !== pp.signJa && ["太陽", "月", "水星", "金星", "火星"].includes(pp.ja)) {
          push({ sourceType: "progression", sourceLabel: `進行${pp.ja} ${natal.signJa}→${pp.signJa}`,
            themes: ["currentSeason", "continuity"],
            note: `生まれ持った${pp.ja}の質に「${SIGN_KEYWORDS[pp.signJa]}」の色が重なってきている`,
            strength: 3, confidence: 0.7, prog: "shift", planet: pp.ja });
        }
      }
    }

    // サビアン度数（象徴。単独では弱い根拠——低confidence）
    const sun = planetByJa(chart, "太陽"), moon = planetByJa(chart, "月");
    const sab = (label, absDeg, themes) => {
      const s = sabianText(absDeg);
      if (s) push({ sourceType: "sabian", sourceLabel: `サビアン ${label}`,
        themes, note: `「${s}」という情景が人物像の背景に重なる`,
        strength: 2, confidence: 0.35, symbol: s });
    };
    sab(`太陽 ${sun.signJa}${sun.sabianDeg}度`, sun.absSabian, ["selfImage"]);
    sab(`月 ${moon.signJa}${moon.sabianDeg}度`, moon.absSabian, ["emotion"]);
    sab(`ASC ${chart.asc.signJa}${chart.asc.sabianDeg}度`, chart.asc.absSabian, ["selfImage"]);
    sab(`ヘッド ${n.signJa}${n.sabianDeg}度`, n.absSabian, ["growth"]);
    sab(`テイル ${t.signJa}${t.sabianDeg}度`, t.absSabian, ["oldStrategy"]);

    return ev;
  }

  // 相互リセプション（構造化版）
  function mutualReceptionPairs(chart) {
    const out = [];
    const ps = chart.planets;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        if (RULER_OF[ps[i].signJa] === ps[j].ja && RULER_OF[ps[j].signJa] === ps[i].ja) {
          out.push({ a: ps[i], b: ps[j] });
        }
      }
    }
    return out;
  }

  // ディスポジターチェーンの終着天体（自分のサインで終着する天体）
  function dispositorChainEnd(chart) {
    const byJa = {};
    for (const p of chart.planets) byJa[p.ja] = p;
    const visited = new Set();
    let cur = RULER_OF[chart.asc.signJa];
    while (cur && !visited.has(cur)) {
      visited.add(cur);
      const p = byJa[cur];
      if (!p) return null;
      const next = RULER_OF[p.signJa];
      if (next === cur) return p; // 自分のサインで終着
      cur = next;
    }
    return null; // ループ（相互リセプション等）は別evidenceで扱う
  }

  // ---------- Layer 2: buildPersonThemes ----------

  function buildPersonThemes(evidence) {
    return THEME_IDS.map((id) => {
      const items = evidence
        .filter((e) => e.themes.includes(id))
        .sort((x, y) => y.strength * y.confidence - x.strength * x.confidence);
      const solid = items.filter((e) => e.confidence >= 0.6);
      let strength = 0;
      if (solid.length) {
        const strong = solid.filter((e) => e.strength >= 3).length;
        strength = Math.min(5, solid[0].strength + 0.6 * Math.max(0, strong - 1));
      }
      // 矛盾する引っぱり（自由志向 vs 安定志向）— 両方を残し、統合ヒントを付す
      const free = solid.filter((e) => e.axis === "自由" && e.strength >= 3);
      const stab = solid.filter((e) => e.axis === "安定" && e.strength >= 3);
      let tension = null;
      if (free.length && stab.length) {
        tension = {
          a: free[0], b: stab[0],
          hint: `自由へ向かう面（${free[0].sourceLabel}）と、土台を固めたい面（${stab[0].sourceLabel}）が同居しています。どちらかが本当の自分なのではなく、両方が本体です。無計画な自由ではなく、自分が把握できる土台の上を自由に動ける形にすると、二つの力が同じ方向を向きやすくなります`,
        };
      }
      return { id, ja: THEME_JA[id], evidence: items, strength, tension };
    });
  }

  // 断定強度: 0=弱（可能性）/ 1=中（傾向）/ 2=強（複数ソース重複）
  function hedgeOf(theme) {
    if (!theme || !theme.evidence.length) return 0;
    const strong = theme.evidence.filter((e) => e.strength >= 4 && e.confidence >= 0.6).length;
    if (theme.strength >= 4.3 && strong >= 2) return 2;
    if (theme.strength >= 3) return 1;
    return 0;
  }
  const HEDGE_TAIL = ["という可能性があります", "しやすい傾向があります", "——これは人生で繰り返しやすい、かなり強いテーマです"];

  // ---------- Layer 3: buildCoreReading ----------

  function buildCoreReading(themes, chart, evidence, prog) {
    const sun = planetByJa(chart, "太陽");
    const byId = {};
    for (const t of themes) byId[t.id] = t;
    const personality = themes.filter((t) => !["currentSeason", "growth", "oldStrategy"].includes(t.id));
    const sorted = [...personality].sort((x, y) => y.strength - x.strength);
    const top = sorted[0];
    const topEv = top.evidence.filter((e) => e.confidence >= 0.6)[0];

    const a = analyze(chart);
    const gift = SIGN_GIFT[sun.signJa];
    const risk = SIGN_RISK[sun.signJa];
    const head = chart.node, tail = chart.tail;
    const growthShort = NODE_SHORT[head.signIndex];

    const mainGift = `${gift}。エレメントの重心が${a.strongestElem}なので、${ELEMENT_STRONG[a.strongestElem]}`;
    const repEv = (byId.repetition.evidence.filter((e) => e.confidence >= 0.6)[0]) || null;
    const mainPattern = repEv
      ? `${repEv.note}（${repEv.sourceLabel}）`
      : "はっきりした反復の構造は目立ちません";
    const mainRisk = `その中心の力が強く出すぎると、${risk}`;
    const growthDirection = `${NODE_SIGN[head.signIndex]}（ヘッド${head.signJa}${head.house}H）。テイル${tail.signJa}${tail.house}Hで培った「${SIGN_KEYWORDS[tail.signJa]}」の力を、この方向へ使い直していく形`;

    let currentLifeChapter = "";
    if (prog) {
      const pMoon = prog.planets.find((p) => p.ja === "月");
      const pSun = prog.planets.find((p) => p.ja === "太陽");
      const season = PROG_SEASON[MODALITY_OF[pMoon.signJa]];
      currentLifeChapter = `進行太陽${pSun.signJa}・進行月${pMoon.signJa}。内側の季節としては「${season}」にあたり、${PROG_MOON_SIGN[pMoon.signIndex]}`;
    }

    const recurringMotifs = [...new Set(
      [...byId.repetition.evidence, ...byId.oldStrategy.evidence]
        .filter((e) => e.confidence >= 0.6 && e.strength >= 3)
        .map((e) => e.sourceLabel)
    )].slice(0, 5);

    // 一文サマリー: 才能＋落とし穴＋成長方向を必ず含む（seedでテンプレートを変える）
    const seed = hashStr(chart.input.dateStr + chart.input.timeStr + sun.signJa + chart.asc.signJa);
    const oneSentenceTemplates = [
      () => `${gift}で自分の世界を立ち上げていく人です。ただし、その同じ力が強く出すぎると、${risk}——その力を「${growthShort}」方向へ使い直していくのが、これからの伸びしろです。`,
      () => `この人の中心にあるのは、${gift}。裏返すと、力が出すぎると${risk}。それが唯一の急所です。「${growthShort}」側へ少しずつ重心を移すほど、持ち味が長く効いてきます。`,
      () => `核にあるのは${gift}です。同じ力が過剰になると、${risk}。だからこそ、「${growthShort}」という新しい使い道が、この人の次の章になります。`,
    ];
    const oneSentence = pick(oneSentenceTemplates, seed)();

    return {
      centralTheme: `${top.ja}${topEv ? `（軸: ${topEv.sourceLabel}）` : ""}`,
      centralThemeId: top.id,
      mainGift, mainPattern, mainRisk, growthDirection, currentLifeChapter,
      recurringMotifs, oneSentence,
    };
  }

  // ---------- Layer 4: buildManual ----------

  function buildManual(core, themes, chart, opts) {
    opts = opts || {};
    const a = opts.analysis || analyze(chart);
    const prog = opts.prog || SabianChart.progressedChart(chart, new Date());
    const evidence = opts.evidence || buildEvidence(chart, prog);
    const num = numerology(chart.input.dateStr);
    const byId = {};
    for (const t of themes) byId[t.id] = t;

    const sun = planetByJa(chart, "太陽"), moon = planetByJa(chart, "月");
    const mercury = planetByJa(chart, "水星"), venus = planetByJa(chart, "金星");
    const mars = planetByJa(chart, "火星"), saturn = planetByJa(chart, "土星");
    const head = chart.node, tail = chart.tail;
    const moonElem = ELEMENT_OF[moon.signJa];
    const ascElem = ELEMENT_OF[chart.asc.signJa];
    const sunGift = SIGN_GIFT[sun.signJa], sunRisk = SIGN_RISK[sun.signJa];
    const growthShort = NODE_SHORT[head.signIndex];
    const pSun = prog.planets.find((p) => p.ja === "太陽");
    const pMoon = prog.planets.find((p) => p.ja === "月");
    const season = PROG_SEASON[MODALITY_OF[pMoon.signJa]];
    const yearPhrase = `「${SIGN_KEYWORDS[tail.signJa].split("・")[0]}のやり方をひとつ休ませて、${growthShort}」一年`;

    const evOf = (list) => [...new Set(list.filter(Boolean).map((e) => (typeof e === "string" ? e : e.sourceLabel)))];
    const topEvs = (id, n, minConf) => byId[id].evidence.filter((e) => e.confidence >= (minConf || 0.6)).slice(0, n || 3);

    // 反復パターンの素材（土星・冥王星・月のハード、テイル、数秘）
    const repEvs = byId.repetition.evidence.filter((e) => e.confidence >= 0.6 && e.strength >= 3);
    const hardAspects = evidence.filter((e) => e.sourceType === "aspect" && e.hard);
    const moonSaturnAsp = chart.aspects.find((x) =>
      (x.a === "月" && x.b === "土星") || (x.a === "土星" && x.b === "月"));

    const chapters = [];

    // 1. あなたを一言でいうと
    chapters.push({
      id: "oneSentence", title: "あなたを一言でいうと",
      body: core.oneSentence + "\n\n" +
        `この一文は、チャート全体でいちばん強く重なったところから組み立てました。中心テーマは「${core.centralTheme}」。ここから先の章で、この一文を少しずつほどきながら、具体的な場面に置き換えていきます。`,
      keyPoints: [
        `中心の才能: ${sunGift}`,
        `繰り返しやすい落とし穴: ${sunRisk.replace(/やすくなります$/, "やすいこと")}`,
        `成長の方向: ${growthShort}こと`,
      ],
      evidence: evOf([`太陽${sun.signJa}${sun.house}H`, `ヘッド${head.signJa}${head.house}H`, ...topEvs(core.centralThemeId, 2)]),
    });

    // 2. あなたの基本OS
    {
      const alonePlanets = chart.planets.filter((p) => [4, 8, 12].includes(p.house)).length;
      const publicPlanets = chart.planets.filter((p) => [1, 5, 7, 10, 11].includes(p.house)).length;
      const stage = publicPlanets > alonePlanets + 1
        ? "エネルギーの多くが人前の領域に置かれています。人の目がある場のほうが力が出やすく、完全に一人だと出力が落ちやすいタイプです"
        : alonePlanets > publicPlanets
        ? "エネルギーの多くが水面下の領域に置かれています。人前ではよそゆきの出力になりやすく、本当の作業は一人の時間に進むタイプです"
        : "人前と一人の時間のバランス型です。どちらかに偏ると調子を崩しやすいので、両方を意図的に確保するのが向いています";
      chapters.push({
        id: "basicOperatingSystem", title: "あなたの基本OS",
        body:
          `${ELEMENT_ORDER_TEXT[a.strongestElem]}。これが、いわばこの人の基本OSです。\n\n` +
          `${MODALITY_DECISION[a.strongestMod]}。考えごとの癖でいうと、水星が${mercury.signJa}にあるので、${PLANET_SIGN["水星"][mercury.signIndex]}——考えごとは、だいたいこの型で進みます。\n\n` +
          `${MOON_CRISIS[moonElem]}。\n\n${stage}。`,
        keyPoints: [
          `反応の順番: ${a.strongestElem}のエレメントが先に動く`,
          `判断基準: ${a.strongestMod}型（${MODALITY_DECISION[a.strongestMod].split("。")[0]}）`,
          `危機時: 月${moon.signJa}（${moonElem}）の反応が出る`,
        ],
        evidence: evOf([`エレメント重心=${a.strongestElem}`, `${a.strongestMod}が優勢`, `月${moon.signJa}${moon.house}H`, `水星${mercury.signJa}${mercury.house}H`]),
      });
    }

    // 3. 外から見えるあなた／内側のあなた
    {
      const h1 = chart.planets.filter((p) => p.house === 1);
      const h4 = chart.planets.filter((p) => p.house === 4);
      const h7 = chart.planets.filter((p) => p.house === 7);
      const h10 = chart.planets.filter((p) => p.house === 10);
      let body =
        `入口（ASC）は${chart.asc.signJa}。初対面の人が受け取るのは「${SIGN_KEYWORDS[chart.asc.signJa]}」の空気です` +
        (h1.length ? `。1ハウスに${h1.map((p) => p.ja).join("・")}があるので、${h1.map((p) => PLANET_ESSENCE[p.ja]).join("と")}も第一印象に乗りやすいでしょう` : "") +
        `。\n\nいっぽう中身の推進力は太陽${sun.signJa}（${sun.house}H）。${PLANET_SIGN["太陽"][sun.signIndex]}——そんな核を内側に持っています。` +
        `さらに内側、素の感情は月${moon.signJa}（${moon.house}H）が受け持っています。${PLANET_SIGN["月"][moon.signIndex]}——これがこの人の素顔です。`;
      if (ascElem !== moonElem) {
        body += `\n\n外側（${ascElem}の空気）と内側（${moonElem}の感情）でエレメントが違うので、「見た目の印象と中身が違う」と言われやすい人です。これはどちらかが嘘なのではなく、出入り口が二つあるということです。第一印象だけで判断されると損をしやすいので、中身を見せる二度目・三度目の機会をつくる価値があります。`;
      } else {
        body += `\n\n外側と内側のエレメントがそろっているので、見た目の印象と中身のずれは小さいほうです。そのぶん取り繕うのは苦手で、調子の悪さも表に出やすいところがあります。`;
      }
      const social = [];
      if (h4.length) social.push(`4ハウス（心の土台）に${h4.map((p) => p.ja).join("・")}`);
      if (h7.length) social.push(`7ハウス（一対一）に${h7.map((p) => p.ja).join("・")}`);
      if (h10.length) social.push(`10ハウス（社会に見える顔）に${h10.map((p) => p.ja).join("・")}`);
      if (social.length) body += `\n\n重心で見ると、${social.join("、")}。このあたりでは、素の自分と社会用の自分が行き交いやすくなっています。`;
      chapters.push({
        id: "outerAndInnerSelf", title: "外から見えるあなた／内側のあなた",
        body,
        keyPoints: [
          `外の顔: ASC${chart.asc.signJa}（${SIGN_KEYWORDS[chart.asc.signJa]}）`,
          `中心の推進力: 太陽${sun.signJa}${sun.house}H`,
          `素の感情: 月${moon.signJa}${moon.house}H`,
        ],
        evidence: evOf([`ASC${chart.asc.signJa}`, `太陽${sun.signJa}${sun.house}H`, `月${moon.signJa}${moon.house}H`,
          ...h10.map((p) => `${p.ja}${p.signJa}10H`)]),
      });
    }

    // 4. 才能が起動する条件
    {
      const wake = [];
      wake.push(`太陽が${sun.house}ハウスにあるので、「${HOUSE_THEME[sun.house]}」の領域に身を置いているとき`);
      wake.push(`火星が${mars.signJa}${mars.house}Hにあるので、${PLANET_HOUSE["火星"][mars.house - 1]}という形でエンジンがかかるとき`);
      if (a.stelliumHouses.length) wake.push(`${a.stelliumHouses[0][0]}ハウス（${HOUSE_THEME[a.stelliumHouses[0][0]]}）に天体が集中しているので、この領域に関わっているとき`);
      const sleep = a.weakestElemCount <= 1
        ? `逆に、「${a.weakestElem}」のエレメントが薄いため、${ELEMENT_WEAK[a.weakestElem]}。この種の作業ばかりが続く環境では、才能が眠ったまま消耗しやすいでしょう`
        : `逆に、${MOD_ROLE[a.strongestMod].avoid}に長く置かれると、出力が落ちやすいタイプです`;
      const partner = `組む相手としては、DSCが${chart.dsc.signJa}なので「${SIGN_KEYWORDS[chart.dsc.signJa]}」の質を持つ人と補い合いやすく、` +
        (a.weakestElemCount <= 1 ? `特に「${a.weakestElem}」の強い人が隣にいると、苦手な部分を任せて本来の力に集中できます。` : `自分と違う型の人が隣にいるほうが、持ち味が際立ちます。`);
      chapters.push({
        id: "talentActivation", title: "才能が起動する条件",
        body:
          `${sunGift}——この中心の力には、電源が入る条件があります。${wake.join("。それから、")}——そんなときに、いちばん自然と動き出します。\n\n${sleep}。\n\n${partner}`,
        keyPoints: [
          `動き出す環境: 「${HOUSE_THEME[sun.house]}」の領域`,
          `眠る環境: ${a.weakestElemCount <= 1 ? `「${a.weakestElem}」型の作業だけが続く場` : MOD_ROLE[a.strongestMod].avoid}`,
          `組む相手: 「${SIGN_KEYWORDS[chart.dsc.signJa]}」の質を持つ人`,
        ],
        evidence: evOf([`太陽${sun.signJa}${sun.house}H`, `火星${mars.signJa}${mars.house}H`, `DSC${chart.dsc.signJa}`,
          a.weakestElemCount <= 1 ? `${a.weakestElem}のエレメントが薄い` : null]),
      });
    }

    // 5. 何度も繰り返す人生パターン
    {
      const lines = [];
      lines.push(`ここに挙げるのは欠点のリストではありません。かつて自分を守るために身につけた、無意識の脚本です。脚本は書き換えられますが、まず自分がどんな台本で動いているかを知ることが先です。`);
      lines.push(`土星は${saturn.signJa}${saturn.house}Hにあります。${PLANET_SIGN["土星"][saturn.signIndex]}——ここが、同じ形のつまずきが出やすい場所です。`);
      const strongHard = hardAspects.filter((e) => e.strength >= 4).slice(0, 2);
      for (const h of strongHard) {
        lines.push(`${h.sourceLabel}（誤差${h.orb}度）——${h.note}。この組み合わせが動く場面は、人生で何度も形を変えて現れ${hedgeOf(byId.repetition) === 2 ? "ます。複数の根拠が重なっており、かなり強いテーマです" : "やすいでしょう"}。`);
      }
      lines.push(`テイル${tail.signJa}${tail.house}Hと数秘${num.lifePath}も同じ方向を指しています。迷ったとき「${SIGN_KEYWORDS[tail.signJa]}」のやり方と「${HOUSE_THEME[tail.house]}」の領域に自動的に戻るのが、この人の初期設定です。戻ること自体は悪くありません。ただ、戻ったことに気づかないまま同じ結末を繰り返すのが、もったいないところです。`);
      chapters.push({
        id: "recurringPatterns", title: "何度も繰り返す人生パターン",
        body: lines.join("\n\n"),
        keyPoints: core.recurringMotifs.length
          ? core.recurringMotifs.slice(0, 3).map((m) => `反復の軸: ${m}`)
          : ["はっきりした反復構造は目立ちません"],
        evidence: evOf([`土星${saturn.signJa}${saturn.house}H`, ...strongHard, `テイル${tail.signJa}${tail.house}H`, `数秘${num.lifePath}`]),
      });
    }

    // 6. 暴走モードと停止モード
    {
      const overdrive = `暴走モードでは、${ELEM_OVERRUN[a.strongestElem]}状態になります。具体的には、${SIGN_RISK[mars.signJa].replace(/なります$/, "なる")}のが典型的なサインです`;
      const shutdown = `停止モードでは逆に、${moonElem === "水" || moonElem === "地" ? "外からは急に無口・無反応に見えます" : "空回りの忙しさだけが残り、肝心なことが進まなくなります"}。月${moon.signJa}が守られていないサインで、${PLANET_SIGN["月"][moon.signIndex].split("。")[0]}という本来の回路が詰まっている状態です`;
      const safetyEv = topEvs("safety", 1)[0];
      const sharedCause = `一見正反対の二つのモードですが、引き金は同じです。${safetyEv ? `${safetyEv.sourceLabel}が示す安全欲求——` : ""}「自分のペースと安心の土台が脅かされている」というサインが、外へ噴き出せば暴走、内へこもれば停止になります。モードを別々に対処するより、共通の火元を消すほうが早いのです`;
      const recovery = [
        MOON_RECOVERY[moonElem],
        `「${HOUSE_THEME[moon.house]}」の領域に戻る時間をつくる（月${moon.house}Hの充電場所）`,
        `再起動の最初の一歩は小さく——${a.strongestMod === "活動宮" ? "5分で終わる着手" : a.strongestMod === "不動宮" ? "いつもの手順をひとつだけ再開" : "予定を一つ減らして余白をつくる"}`,
      ];
      chapters.push({
        id: "overdriveAndShutdown", title: "暴走モードと停止モード",
        body: `${overdrive}。\n\n${shutdown}。\n\n${sharedCause}。\n\n回復の手順:\n- ${recovery.join("\n- ")}`,
        keyPoints: [
          `暴走のサイン: ${ELEM_OVERRUN[a.strongestElem]}`,
          `停止のサイン: 月${moon.signJa}の回路が詰まる`,
          "共通の火元: ペースと安心の土台が脅かされていること",
        ],
        evidence: evOf([`エレメント重心=${a.strongestElem}`, `月${moon.signJa}${moon.house}H`, `火星${mars.signJa}${mars.house}H`, safetyEv]),
      });
    }

    // 7. 対人関係での取扱注意事項
    {
      const h7 = chart.planets.filter((p) => p.house === 7);
      let body =
        `関係の入口: 初対面では${chart.asc.signJa}の「${SIGN_KEYWORDS[chart.asc.signJa]}」で接し、相手には「${SIGN_KEYWORDS[chart.dsc.signJa]}」（DSC${chart.dsc.signJa}）の質を無意識に探しています。\n\n` +
        `信頼が育つ条件: 金星が${venus.signJa}${venus.house}Hなので、${PLANET_SIGN["金星"][venus.signIndex]}——という親密さの型を持っています。月が${moonElem}のエレメントにあるので、${MOON_WANT[moonElem]}が信頼の入口になります。\n\n` +
        `失望が起きる瞬間: ${MOON_HURT[moonElem]}を向けられたとき、この人は表向き流しても内側で一段距離を取ります。距離の取り方は${moonElem === "水" ? "静かで、気づかれにくい" : moonElem === "火" ? "はっきりしていて、その場で分かる" : moonElem === "地" ? "ゆっくりで、しかし戻りにくい" : "軽やかに見えて、実は決定的"}タイプです。`;
      if (h7.length) {
        body += `\n\n7ハウスに${h7.map((p) => p.ja).join("・")}があるので、一対一の関係はこの人にとって単なる社交ではなく、${h7.map((p) => PLANET_ESSENCE[p.ja]).join("と")}が試される人生の学び場になりやすいでしょう。`;
      }
      chapters.push({
        id: "relationships", title: "対人関係での取扱注意事項",
        body,
        keyPoints: [
          `言われると傷つく言葉: ${MOON_HURT[moonElem]}`,
          `本当は言ってほしい言葉: ${MOON_WANT[moonElem]}`,
          `信頼の条件: 金星${venus.signJa}型の親密さを尊重すること`,
        ],
        evidence: evOf([`DSC${chart.dsc.signJa}`, `金星${venus.signJa}${venus.house}H`, `月${moon.signJa}${moon.house}H`,
          ...h7.map((p) => `${p.ja}${p.signJa}7H`)]),
      });
    }

    // 8. 仕事での正しい役割
    {
      const role = MOD_ROLE[a.strongestMod];
      const mc10 = chart.planets.filter((p) => p.house === 10);
      let body =
        `職業名より先に、役割の型を確かめるほうが役に立ちます。この人に合うのは、${role.best}です。エレメントの重心が${a.strongestElem}なので、その中でも${ELEM_ROLE[a.strongestElem]}が持ち場になってきます。\n\n` +
        `避けたほうがいいのは、${role.avoid}。能力の問題ではなく、燃料の種類が合わないという話です。\n\n` +
        `リーダーとしては、${sunGift.replace(/力$/, "")}姿勢が強みです。ただし${sunRisk.replace(/なります$/, "なる")}のが役職上のリスクで、その部分は仕組みか相棒で補うのが現実的です。`;
      if (mc10.length) body += `MCまわり（10H）に${mc10.map((p) => p.ja).join("・")}があるので、社会的な看板と${mc10.map((p) => PLANET_ESSENCE[p.ja]).join("・")}が結びつきやすくなっています。`;
      chapters.push({
        id: "workRole", title: "仕事での正しい役割",
        body,
        keyPoints: [
          `最適な役割: ${role.best.split("。")[0]}`,
          `合わない持ち場: ${role.avoid}`,
          `リーダーとしての強み/リスク: ${sunGift.split("、")[0]} / ${sunRisk.replace(/やすくなります$/, "やすい")}`,
        ],
        evidence: evOf([`${a.strongestMod}が優勢`, `エレメント重心=${a.strongestElem}`, `MC${chart.mc.signJa}`, `太陽${sun.signJa}${sun.house}H`]),
      });
    }

    // 9. お金との付き合い方
    {
      const h2 = chart.planets.filter((p) => p.house === 2);
      let body = `この人にとってお金は、それ自体が目的ではなく、${MOON_MONEY_PURPOSE[moonElem]}の道具になりやすいものです。ここを取り違えると、金額は増えても満足が増えません。\n\n`;
      if (h2.length) {
        body += `2ハウス（お金・才能・所有）には${h2.map((p) => p.ja).join("・")}。${h2.map((p) => PLANET_HOUSE[p.ja][1]).join("。")}——お金は、この人の人生の大事な舞台のひとつです。\n\n`;
      } else {
        body += `2ハウスに天体はなく、お金は人生の主戦場ではありません。金星${venus.signJa}の価値観——${SIGN_KEYWORDS[venus.signJa]}——に沿った使い方をしているときが、いちばん健全に回ります。\n\n`;
      }
      const moneyRisk = saturn.house === 2
        ? "土星が2Hにあるため、不安からの締めすぎが出やすい点"
        : `${SIGN_RISK[venus.signJa].replace(/なります$/, "なる")}形で、使い方に偏りが出やすい点`;
      body += `強み: ${a.strongestElem === "地" ? "現実的な管理と蓄積が肌に合っています" : a.strongestElem === "火" ? "投資的な思い切りのよさがあります" : a.strongestElem === "風" ? "情報と人脈をお金に変える回路があります" : "人とのつながりが結果的に資源を運んできます"}。注意点: ${moneyRisk}。実務的には、「${MOON_MONEY_PURPOSE[moonElem]}」に直結する支出は聖域として確保し、それ以外に上限を決める——この順番が合っています。`;
      chapters.push({
        id: "moneyPattern", title: "お金との付き合い方",
        body,
        keyPoints: [
          `お金を求める理由: ${MOON_MONEY_PURPOSE[moonElem]}`,
          `強み: ${a.strongestElem}のエレメント型の金銭感覚`,
          `注意点: ${moneyRisk}`,
        ],
        evidence: evOf([...h2.map((p) => `${p.ja}${p.signJa}2H`), `金星${venus.signJa}${venus.house}H`, `月${moon.signJa}${moon.house}H`, `数秘${num.lifePath}`]),
      });
    }

    // 10. 持ってきた古い生存戦略
    {
      const weapons = [
        `「${SIGN_KEYWORDS[tail.signJa]}」を軸にした立ち回り（テイル${tail.signJa}）`,
        `「${HOUSE_THEME[tail.house]}」の領域での慣れた役回り（テイル${tail.house}H）`,
      ];
      if (moonSaturnAsp) weapons.push(`感情を律して乗り切る型（月×土星${moonSaturnAsp.type}）`);
      else weapons.push(`土星${saturn.signJa}型の自己管理（${SIGN_KEYWORDS[saturn.signJa].split("・")[0]}で締める）`);
      const body =
        `誰にでも、使い慣れすぎた武器があります。この人の場合それは、${weapons.join("、そして")}です。\n\n` +
        `どれも長いあいだこの人を守って、ちゃんと働いてきたものです。責められるようなものではありません。ただ、限界もはっきりしています。「${SIGN_KEYWORDS[tail.signJa]}」のやり方に頼りすぎると、${SIGN_RISK[tail.signJa]}。慣れた武器ほど、効かなくなっていることに気づきにくいのです。\n\n` +
        `見分け方はシンプルです。疲れているのに同じ手を繰り返しているとき、それは判断ではなく習慣です。武器を捨てる必要はありません。次の章で見る新しい使い道が用意されています。`;
      chapters.push({
        id: "oldSurvivalStrategy", title: "持ってきた古い生存戦略",
        body,
        keyPoints: [
          `使い慣れた武器: ${weapons[0]}`,
          `得意な戻り場所: ${HOUSE_THEME[tail.house]}`,
          `限界: ${SIGN_RISK[tail.signJa].replace(/やすくなります$/, "やすい")}`,
        ],
        evidence: evOf([`テイル${tail.signJa}${tail.house}H`, moonSaturnAsp ? `月×土星${moonSaturnAsp.type}` : `土星${saturn.signJa}${saturn.house}H`]),
      });
    }

    // 11. これから育てる新しい自分
    {
      const growthTasks = [
        `${NODE_SHORT[head.signIndex]}機会を、小さくてよいので定期的につくる`,
        `「${HOUSE_THEME[head.house]}」（ヘッド${head.house}H）の領域に、意識して時間を割り当てる`,
        `テイル${tail.signJa}の反射で即答しそうになったら、ひと呼吸置いて選び直す`,
      ];
      const body =
        `ドラゴンヘッドは${head.signJa}${head.house}H。方向としては、${NODE_SIGN[head.signIndex]}。舞台は「${HOUSE_THEME[head.house]}」の領域です。\n\n` +
        `大事なのは、これが「今までの自分を捨てて別人になる」話ではないことです。テイル${tail.signJa}で磨いてきた「${SIGN_KEYWORDS[tail.signJa]}」の力は、そのまま持っていきます。変わるのは使い道です。慣れた領域で自分を守るために使ってきた力を、「${growthShort}」ために使い直す——この統合の形が、この人の成長の設計図です。\n\n` +
        `最初はぎこちなく感じるはずです。テイル側は熟練、ヘッド側は初心者なのだから当然です。うまくやろうとするより、下手なまま続けることに価値があります。`;
      chapters.push({
        id: "growthDirection", title: "これから育てる新しい自分",
        body,
        keyPoints: growthTasks,
        evidence: evOf([`ヘッド${head.signJa}${head.house}H`, `テイル${tail.signJa}${tail.house}H`]),
      });
    }

    // 12. 今、人生の何章にいるのか
    {
      const shifts = prog.planets
        .filter((pp) => { const nat = chart.planets.find((p) => p.ja === pp.ja); return nat && nat.signJa !== pp.signJa; })
        .filter((pp) => ["太陽", "月", "水星", "金星", "火星"].includes(pp.ja));
      const ending = `手放しつつあるもの: ネイタル${sun.signJa}の太陽が進行で${pSun.signJa}に${sun.signJa === pSun.signJa ? "はまだ移っておらず、生まれ持った章の深まりの中にいます" : `移っており、「${SIGN_KEYWORDS[sun.signJa]}」一色だった時代は後ろに下がりつつあります`}`;
      const emerging = `育ちつつあるもの: 進行太陽${pSun.signJa}の「${SIGN_KEYWORDS[pSun.signJa]}」の質${shifts.length > 1 ? `。あわせて${shifts.filter((s) => s.ja !== "太陽").map((s) => `進行${s.ja}の${s.signJa}`).join("・")}の色も重なってきています` : ""}`;
      const body =
        `これは未来の予言ではありません。人格にも季節があり、いまどの章にいるかという話です。二次進行（1日=1年）で内側の時計を読みます。\n\n` +
        `進行月は${pMoon.signJa}にあり、内側の季節は「${season}」です。${PROG_MOON_SIGN[pMoon.signIndex]}——そういう季節の空気の中にいます。この季節は約2.5年でサインひとつぶん移ろいます。\n\n` +
        `${ending}。\n\n${emerging}。いま無理に結論を出すより、この季節に合った作業——${season === "新しく始める時期" ? "種まきと着手" : season === "始まったものを育てる時期" ? "続けることと深めること" : "整理と選び直し"}——に集中するほうが、時間をうまく使えます。`;
      chapters.push({
        id: "currentLifeChapter", title: "今、人生の何章にいるのか",
        body,
        keyPoints: [
          `内側の季節: ${season}（進行月${pMoon.signJa}）`,
          `いまの章のトーン: 進行太陽${pSun.signJa}`,
          `この季節の作業: ${season === "新しく始める時期" ? "種まきと着手" : season === "始まったものを育てる時期" ? "継続と深化" : "整理と選び直し"}`,
        ],
        evidence: evOf([`進行太陽${pSun.signJa}`, `進行月${pMoon.signJa}`, ...shifts.map((s) => `進行${s.ja} ${chart.planets.find((p) => p.ja === s.ja).signJa}→${s.signJa}`)]),
      });
    }

    // 13. 今やること／やらなくていいこと
    {
      const doNow = [
        `「${HOUSE_THEME[head.house]}」の領域で、${NODE_SHORT[head.signIndex]}最初の小さな一歩を決める`,
        `${season === "手放して整理する時期" ? "抱えているものを棚卸しして、続けるものと終えるものを仕分ける" : season === "新しく始める時期" ? "新しく始めたいことを一つだけ選び、今週中に着手する" : "すでに始まっているものを一つ選び、深く育てる時間を確保する"}`,
        `${MOON_RECOVERY[moonElem].split("（")[0].trim()}時間を、予定として先に確保する`,
      ];
      const doNotNeedNow = [
        `テイル${tail.signJa}側の「${SIGN_KEYWORDS[tail.signJa].split("・")[0]}」で全部を解決しようとすること`,
        `苦手な「${a.weakestElem}」の作業を独力で完璧にすること（人に任せてよい領域です）`,
        `全員に理解されようとすること（外の顔と中身が違うのは仕様です）`,
      ];
      const doNotDecideYet = [
        `人生の大きな方向転換の最終決定（いまは「${season}」——結論はこの季節の作業が済んでから）`,
      ];
      const cautions = [
        `${sunRisk.replace(/なります$/, "なる")}兆候が出たら、暴走モードのサインです`,
        `${MOON_HURT[moonElem].split("——")[0]}系の言葉が続く環境からは、距離を取ってかまいません`,
      ];
      chapters.push({
        id: "actionGuide", title: "今やること／やらなくていいこと",
        body:
          `今やること:\n- ${doNow.join("\n- ")}\n\n` +
          `やらなくていいこと:\n- ${doNotNeedNow.join("\n- ")}\n\n` +
          `まだ決めなくていいこと:\n- ${doNotDecideYet.join("\n- ")}\n\n` +
          `注意報:\n- ${cautions.join("\n- ")}\n\n` +
          `今年のフレーズ: ${yearPhrase}。`,
        keyPoints: [doNow[0], doNotNeedNow[0], `今年のフレーズ: ${yearPhrase}`],
        evidence: evOf([`ヘッド${head.signJa}${head.house}H`, `進行月${pMoon.signJa}`, `テイル${tail.signJa}${tail.house}H`, `月${moon.signJa}${moon.house}H`]),
      });
    }

    // 正直な指摘（毒3割）— 根拠の強いものだけを出す
    const honestInsights = {};
    if (chart.asc.signJa !== moon.signJa && ascElem !== moonElem) {
      honestInsights.selfMisunderstanding =
        `自分では「${SIGN_KEYWORDS[moon.signJa]}」の内面こそ本当の自分だと感じているはずですが、周囲が日々接しているのは「${SIGN_KEYWORDS[chart.asc.signJa]}」の外面です。「わかってもらえない」と感じる場面の半分は、相手の鈍さではなく、この二重構造を自分が説明していないことから来ています。`;
    }
    const tightHard = hardAspects.filter((e) => e.orb <= 2).sort((x, y) => x.orb - y.orb)[0];
    if (tightHard) {
      honestInsights.whatOthersCannotSay =
        `近くにいる人ほど口にしにくいのは、${tightHard.sourceLabel}（誤差${tightHard.orb}度）が動くときの張りつめ方です。本人にとっては当たり前の内圧なので自覚しにくいのですが、周囲はその圧を確かに受け取っています。指摘されないのは問題がないからではなく、指摘しづらいからです。`;
    }
    const elemShare = a.elemCount[a.strongestElem] / (a.elemCount["火"] + a.elemCount["地"] + a.elemCount["風"] + a.elemCount["水"]);
    if (elemShare >= 0.4) {
      honestInsights.whenTalentBecomesTrouble =
        `エレメントの重心が「${a.strongestElem}」に強く偏っています。${ELEMENT_STRONG[a.strongestElem].split("。")[0]}——これは間違いなく武器ですが、疲れているときほど${ELEM_OVERRUN[a.strongestElem]}形で裏返ります。才能が迷惑に変わる瞬間は、たいてい本人の自覚より先に周囲が気づいています。`;
    }
    if (byId.repetition.strength >= 3.5) {
      honestInsights.notBecauseOfTheStars =
        `繰り返しているパターン（${core.recurringMotifs.slice(0, 2).join("、") || "反復のテーマ"}）は、星に強制されているわけではありません。かつて有効だった対処法を、状況が変わった今も使い続けている——それだけのことです。星は初期設定を示すだけで、選び直す権利はいつでも本人の手元にあります。`;
    }

    // 14. あなたの取扱説明書・最終要約
    {
      const manualFields = {
        powerOnConditions: `「${HOUSE_THEME[sun.house]}」の領域に身を置き、${a.strongestElem}のエレメントが先に動ける状態にあること。`,
        bestPerformanceConditions: `${MOD_ROLE[a.strongestMod].best.split("。")[0]}で、${ELEM_ROLE[a.strongestElem].replace(/役割$/, "役")}を任されているとき。`,
        failureProneEnvironment: `${MOD_ROLE[a.strongestMod].avoid}。加えて「${a.weakestElem}」型の作業だけが延々と続く場。`,
        overdriveSymptoms: `${ELEM_OVERRUN[a.strongestElem]}。${sunRisk}`,
        shutdownSymptoms: `月${moon.signJa}の回路が詰まり、${moonElem === "水" || moonElem === "地" ? "無口・無反応になる" : "空回りの忙しさだけが残る"}。`,
        recoveryMethod: `${MOON_RECOVERY[moonElem]}。「${HOUSE_THEME[moon.house]}」の領域に戻る時間をつくる。`,
        relationshipNeeds: `${MOON_WANT[moonElem]}。金星${venus.signJa}型の親密さ（${SIGN_KEYWORDS[venus.signJa]}）を急かさないこと。`,
        bestWorkRole: `${MOD_ROLE[a.strongestMod].best.split("。")[0]}。`,
        rolesToDelegate: `「${a.weakestElem}」のエレメントが担う作業と、${MOD_ROLE[a.strongestMod].avoid.replace(/持ち場$/, "役回り")}。`,
        moneyCaution: `お金は${MOON_MONEY_PURPOSE[moonElem]}の道具。目的を見失った損得勘定に入ると、満足が減っていく。`,
        lifeGrowthDirection: `テイル${tail.signJa}の「${SIGN_KEYWORDS[tail.signJa].split("・")[0]}」を土台に、${growthShort}方向へ。`,
        currentChapter: `進行月${pMoon.signJa}——「${season}」。進行太陽${pSun.signJa}の章。`,
        yearPhrase: `${yearPhrase}。`,
      };
      const labels = {
        powerOnConditions: "電源が入る条件", bestPerformanceConditions: "最高性能が出る条件",
        failureProneEnvironment: "故障しやすい環境", overdriveSymptoms: "暴走の症状",
        shutdownSymptoms: "停止の症状", recoveryMethod: "回復方法",
        relationshipNeeds: "対人関係で必要なもの", bestWorkRole: "最適な仕事の役割",
        rolesToDelegate: "人に任せてよい役割", moneyCaution: "お金の注意点",
        lifeGrowthDirection: "人生の成長方向", currentChapter: "現在の章", yearPhrase: "今年のフレーズ",
      };
      chapters.push({
        id: "manual", title: "あなたの取扱説明書・最終要約",
        body: Object.keys(manualFields).map((k) => `- ${labels[k]}: ${manualFields[k]}`).join("\n"),
        keyPoints: [core.oneSentence],
        evidence: evOf([`太陽${sun.signJa}${sun.house}H`, `月${moon.signJa}${moon.house}H`, `ヘッド${head.signJa}${head.house}H`, `進行月${pMoon.signJa}`]),
        fields: manualFields,
      });
    }

    // テーマ内の矛盾（引っぱり合い）は消さずに統合ヒントとして持たせる
    const tensions = themes.filter((t) => t.tension).map((t) => ({ theme: t.ja, hint: t.tension.hint }));

    return { chapters, honestInsights, tensions, yearPhrase };
  }

  // ---------- レポート生成（14章の取扱説明書） ----------

  const HONEST_LABELS = {
    selfMisunderstanding: "自分についての勘違い",
    whatOthersCannotSay: "周りが言いにくいこと",
    whenTalentBecomesTrouble: "才能が迷惑に変わる瞬間",
    notBecauseOfTheStars: "星のせいではないこと",
  };

  function runPipeline(chart) {
    const analysis = analyze(chart);
    const prog = SabianChart.progressedChart(chart, new Date());
    const evidence = buildEvidence(chart, prog);
    const themes = buildPersonThemes(evidence);
    const core = buildCoreReading(themes, chart, evidence, prog);
    const manual = buildManual(core, themes, chart, { analysis, prog, evidence });
    return { analysis, prog, evidence, themes, core, manual };
  }

  function buildReport(chart, name) {
    const pipe = runPipeline(chart);
    const { manual, core, analysis } = pipe;

    const sections = manual.chapters.map((ch) => ({
      id: ch.id, title: ch.title, body: ch.body,
      keyPoints: ch.keyPoints || [], evidence: ch.evidence || [],
    }));

    // 正直な指摘（根拠の強い項目のみ）を第13章と第14章の間に挿す
    const hi = manual.honestInsights;
    const hiKeys = Object.keys(hi);
    if (hiKeys.length) {
      const body = hiKeys.map((k) => `【${HONEST_LABELS[k]}】\n${hi[k]}`).join("\n\n");
      sections.splice(sections.length - 1, 0, {
        id: "honestInsights", title: "正直な指摘", body,
        keyPoints: [], evidence: [],
      });
    }

    // サビアンシンボル一覧は巻末の折りたたみ参照として残す
    sections.push({
      id: "sabian", title: "サビアンシンボル一覧（参照）",
      body: buildSabianTable(chart), keyPoints: [], evidence: [], collapsible: true,
    });

    let note = "";
    if (chart.houseSystem === "whole-sign") {
      note = "※ 出生地が高緯度のためプラシダス方式が使えず、ホールサイン方式でハウスを計算しています。";
    }
    return { sections, analysis, core, manual, note };
  }

  // Markdown全文（14章構成）
  function toMarkdown(chart, name, report) {
    const r = report || buildReport(chart, name);
    let md = `# ${name || "無名"} さんの取扱説明書\n\n`;
    md += `- 生年月日: ${chart.input.dateStr} ${chart.input.timeStr}（UTC${chart.input.utcOffsetHours >= 0 ? "+" : ""}${chart.input.utcOffsetHours}）\n`;
    md += `- 出生地: 緯度 ${chart.input.lat} / 経度 ${chart.input.lon}\n`;
    md += `- ハウス: ${chart.houseSystem === "placidus" ? "プラシダス" : "ホールサイン"} / ASC ${chart.asc.signJa}${chart.asc.degInt}度 / MC ${chart.mc.signJa}${chart.mc.degInt}度\n\n`;
    if (r.note) md += r.note + "\n\n";
    for (const s of r.sections) {
      md += `## ${s.title}\n\n${s.body}\n\n`;
      if (s.keyPoints && s.keyPoints.length) {
        md += s.keyPoints.map((k) => `- **${k}**`).join("\n") + "\n\n";
      }
      if (s.evidence && s.evidence.length) {
        md += `> 読みの背景: ${s.evidence.join(" / ")}\n\n`;
      }
    }
    if (chart.aspects.length) {
      md += `## 主要アスペクト（参照）\n\n`;
      md += chart.aspects.map((x) => `- ${x.a}－${x.b}: ${x.type}（誤差${x.orb}度）`).join("\n") + "\n";
    }
    return md;
  }

  // ---------- Claude深読み用プロンプト（14章のフル版を依頼する） ----------

  // 仕様書（章構成＋文章ルール）の全文。フルプロンプトと web/reading-spec.txt の両方の源泉。
  function promptSpecLines() {
    const lines = [];
    lines.push("【出力の構成 — 以下の14章を必ずこの順番で。章題もこの通りに】");
    lines.push("1「あなたを一言でいうと」— 中心の才能＋繰り返しやすい落とし穴＋成長の方向を一つの文に統合した一文サマリーと、その解説。");
    lines.push("2「あなたの基本OS」— 反応と意思決定の順番（行動・思考・感情のどれが先に動くか）、判断基準、不意打ちの危機での反応、一人のときと人前とでの出力の違い。");
    lines.push("3「外から見えるあなた／内側のあなた」— ASC・太陽・月と1/4/7/10ハウスを統合。外の顔と中身の落差、誤解されやすい点。");
    lines.push("4「才能が起動する条件」— 才能が発動する環境、眠ってしまう環境、組むと補い合える相手のタイプ。");
    lines.push("5「何度も繰り返す人生パターン」— 土星・冥王星・月・ノード・ハードアスペクト・数秘の課題から。断罪せず、「身を守るために身につけた無意識の脚本」として描く。");
    lines.push("6「暴走モードと停止モード」— 暴走時の症状、停止時の症状、そして必ず両モードの共通原因を示す。回復の手順を具体的に。");
    lines.push("7「対人関係での取扱注意事項」— 関係の入口→信頼が育つ条件→失望が起きる瞬間→距離の取り方。言われると傷つく言葉と、本当は言ってほしい言葉。");
    lines.push("8「仕事での正しい役割」— 職業名ではなく役割の型で（0→1の立ち上げ／1→10に育てる／運用／接続／言語化など）。合う役割・避けたい持ち場・リーダーとしての強みとリスク。");
    lines.push("9「お金との付き合い方」— お金への心理と行動。この人が何のためにお金を求めるのか。強み・注意点・実務的な工夫。");
    lines.push("10「持ってきた古い生存戦略」— ドラゴンテイルを中心に、月や土星も重ねて。「使い慣れすぎた武器」として、その有効性と限界の両方を描く。");
    lines.push("11「これから育てる新しい自分」— ドラゴンヘッドを中心に。必ず「テイルで培った能力をヘッドの方向へ使い直す」という統合の形で書く。捨てさせない。育てる課題を具体的に。");
    lines.push("12「今、人生の何章にいるのか」— プログレス（二次進行）を「内側の季節」として読む。始める時期か、育てる時期か、手放す時期か。終わりつつあるテーマと芽生えつつあるテーマ。未来予測ではなく人格の季節変化として。");
    lines.push("13「今やること／やらなくていいこと」— 今やること3つ／やらなくていいこと3つ／まだ決めなくていいこと1〜2つ／注意報2〜3つ／今年のフレーズひとつ。");
    lines.push("正直な指摘 — 13章のあとに独立の節として。(a)自分についての勘違い (b)周りが言いにくいこと (c)才能が迷惑に変わる瞬間 (d)星のせいではないこと、の4項目。ただし根拠の強いものだけを書き、根拠の弱い項目は省く。");
    lines.push("14「あなたの取扱説明書・最終要約」— 電源が入る条件／最高性能が出る条件／故障しやすい環境／暴走の症状／停止の症状／回復方法／対人関係で必要なもの／最適な仕事の役割／人に任せてよい役割／お金の注意点／人生の成長方向／現在の章／今年のフレーズ。各1〜3文の箇条書き。");
    lines.push("");
    lines.push("【文章のルール — すべて厳守】");
    lines.push("- 占術用語を実生活に翻訳する。「火が多い→行動力がある」のような紋切り型は禁止。良い例の粒度:「考えが完全にまとまるのを待ってから動く人ではありません。身体や直感が先に反応し、動き始めたあとで頭が意味を組み立てます」。");
    lines.push("- 長所と弱点は必ず表裏一体で書く。長所を書いたら「その力が強く出すぎると◯◯」まで必ず続ける。");
    lines.push("- トーンは共感7割・毒3割。温かく、しかし率直に。恐怖を煽らない。過剰に持ち上げない。");
    lines.push("- 禁止表現:「あなたは素晴らしい人です」「特別な使命」「宇宙が導く」「魂が選んだ」「必ず成功」「運命です」、および「覚醒」「波動」「過去世」という語。");
    lines.push("- 断定の強さは根拠の量で3段階に使い分ける。根拠が弱い=「〜の可能性があります」／中=「〜しやすい傾向があります」／複数ソースが重なる=「かなり強い傾向です」「人生で繰り返しやすいテーマです」。");
    lines.push("- チャート内の矛盾（例: 自由を求める配置と安定を求める配置の同居）は、どちらかを消さずに構造として統合する。例:「自由を求める人ですが、無計画な自由ではなく、自分が把握できる土台の上を自由に動きたい人です」。");
    lines.push("- サビアンシンボルは本文で度数の説明をしない。情景として人物像の補強にだけ使う。サビアン単独を強い主張の根拠にしない。");
    lines.push("- プログレスは「内側の季節」。出来事の予言はしない。");
    lines.push("- 数秘は補強材料。占星術と一致すれば根拠を強め、矛盾すれば「場面による役割分担」として読む。");
    lines.push("- ドラゴンテイル=使い慣れすぎた武器、ドラゴンヘッド=その武器の新しい使い直し先。テイルの否定はしない。");
    lines.push("- 章の役割分担を守り、同じ内容の文を複数の章で繰り返さない。OS=反応と意思決定／4章=発動環境／5章=繰り返し／6章=不調時／7章=関係性／8章=役割／9章=資源／10章=古い戦略／11章=成長方向／12章=現在の季節。");
    return lines;
  }

  const SPEC_URL = "https://ycloud77.github.io/sabian/reading-spec.txt";
  const ROLE_LINE = "あなたは松村潔系のサビアン占星術と心理占星術に深く通じた読み手です。依頼者と同じ机に座り、向かい合って話す文体で書いてください。鑑定書ではなく、本人が一生使える「自分の取扱説明書」を一緒に書く仕事です。";

  // ---------- 鑑定士ペルソナ（Claude深読み専用。アプリ内レポートには適用しない） ----------

  const PERSONAS = {
    anesan: {
      label: "縁側の姉さん", emoji: "🍵",
      hint: "あたたかくて遠慮のない関西寄りの口調。呼びかけは「あんた」。毒は笑いに包んで出す",
      description: "人生の機微を知り尽くした年上の友人。関西の血が入った、あたたかくて遠慮のない口調で話す。呼びかけは「あんた」。毒は笑いに包んで出す。語尾の例:「〜やからね」「〜なんよ」「〜でしょう」「〜ちゃう？」。",
      sample: "「あんたの中にはね、アクセルとブレーキが同じ足で踏まれてるようなとこがあるの。かみ合ってるときは最強よ。でも崩れてくると、全部自分で仕切りだすでしょう。……心当たり、あるんちゃう？ 休むのも段取りのうちやからね。」",
    },
    fukurou: {
      label: "樹上のフクロウ", emoji: "🦉",
      hint: "静かで詩的、比喩を使い、毒は最後の一刺し。呼びかけは「あなた」",
      description: "「サビアンの鏡」の主。静かで、詩的で、短い言葉に重みがある。比喩（手綱・湖面・巣・弓・香りなど、自然と職人の道具）を使う。呼びかけは「あなた」。毒は最後の一刺しで、静かに。断定しないが、曖昧にもしない。",
      sample: "「あなたの内側では、駆けだす力と手綱を引く力が、同じ一頭の馬に乗っています。整っているあいだ、それは見事な歩様になる。崩れると、あなたはすべての手綱を一人で握ろうとする。——手綱を握ったまま眠ることは、できませんよ。」",
    },
    master: {
      label: "バーのマスター", emoji: "🥃",
      hint: "深夜のカウンター越しの大人の距離感。呼びかけは「あなた」。毒は静かに一言",
      description: "深夜のカウンター越しの聞き上手。大人の距離感で、決めつけない、でも見抜いている。呼びかけは「あなた」。ときどきバーの情景（グラス・カウンター・常連・今夜）を挟む。毒は静かにグラスを置くように、一言。",
      sample: "「アクセルとブレーキ、両方いっぺんに踏むタイプですね。かみ合ってるときは誰も追いつけない。でも崩れたときのあなた、全部自分で仕切ろうとするでしょう。……それ、周りはけっこう前から気づいてますよ。今夜くらい、段取りを手放してもいいんじゃないですか。」",
    },
  };
  const DEFAULT_PERSONA = "fukurou";

  function personaOf(personaId) {
    return PERSONAS[personaId] || PERSONAS[DEFAULT_PERSONA];
  }

  // 仕様書（reading-spec.txt）用のペルソナ定義セクション
  function personaSpecLines() {
    const lines = [];
    lines.push("【鑑定士ペルソナ定義】");
    lines.push("プロンプト側で、以下のうちどのペルソナを適用するかが名指しされます。名指しされたペルソナの声で、14章すべてと「正直な指摘」を最初から最後まで書いてください。上記の文章ルール（共感7割・毒3割、断定強度の3段階、禁止表現、章の役割分担など）は、どのペルソナでもすべてそのまま守ります。変わるのは声だけです。");
    for (const id of Object.keys(PERSONAS)) {
      const p = PERSONAS[id];
      lines.push("");
      lines.push(`■ ${p.emoji} ${p.label}（id: ${id}）${id === DEFAULT_PERSONA ? "※標準" : ""}`);
      lines.push(`人格・口調: ${p.description}`);
      lines.push(`文体見本: ${p.sample}`);
    }
    return lines;
  }

  // フルプロンプトに埋め込むペルソナブロック（選択された1体のみ）
  function personaPromptLines(personaId) {
    const p = personaOf(personaId);
    return [
      `【鑑定士ペルソナ: ${p.emoji} ${p.label}】`,
      `人格・口調: ${p.description}`,
      `文体見本: ${p.sample}`,
      "全14章と「正直な指摘」を、最初から最後までこの鑑定士の声で書いてください。文章ルール（共感7割・毒3割、断定強度の3段階、禁止表現など）はすべて維持したまま、声だけをこのペルソナにします。",
    ];
  }

  // データブロック（下読み・テーマ根拠・チャート全データ）
  function promptDataLines(chart, name) {
    const pipe = runPipeline(chart);
    const { core, themes, prog } = pipe;
    const num = numerology(chart.input.dateStr);
    const lines = [];
    lines.push("【アプリによる下読み（ルールベースの一次解析。これを出発点に、より深く）】");
    lines.push(`- 一文サマリー: ${core.oneSentence}`);
    lines.push(`- 中心テーマ: ${core.centralTheme}`);
    lines.push(`- 主な才能: ${core.mainGift}`);
    lines.push(`- 主なパターン: ${core.mainPattern}`);
    lines.push(`- 主なリスク: ${core.mainRisk}`);
    lines.push(`- 成長方向: ${core.growthDirection}`);
    lines.push(`- 現在の章: ${core.currentLifeChapter}`);
    lines.push(`- 反復モチーフ: ${core.recurringMotifs.join("、") || "特筆なし"}`);
    lines.push("");
    lines.push("【テーマ別の根拠まとめ（強度は1〜5）】");
    for (const t of themes) {
      const tops = t.evidence.filter((e) => e.confidence >= 0.6).slice(0, 4);
      if (!tops.length) continue;
      lines.push(`- ${t.ja}（強度${t.strength.toFixed(1)}）: ${tops.map((e) => e.sourceLabel).join(" / ")}${t.tension ? ` ※引っぱり合いあり: ${t.tension.a.sourceLabel}⇔${t.tension.b.sourceLabel}` : ""}`);
    }
    lines.push("");
    lines.push(`【基本データ】${name || "対象者"} / ${chart.input.dateStr} ${chart.input.timeStr}（UTC${chart.input.utcOffsetHours >= 0 ? "+" : ""}${chart.input.utcOffsetHours}） / 緯度${chart.input.lat} 経度${chart.input.lon}`);
    lines.push(`【ハウスシステム】${chart.houseSystem === "placidus" ? "プラシダス" : "ホールサイン"} / ASC ${chart.asc.signJa}${chart.asc.degInSign.toFixed(1)}度 / MC ${chart.mc.signJa}${chart.mc.degInSign.toFixed(1)}度 / DSC ${chart.dsc.signJa}`);
    lines.push("【構造データ】");
    lines.push(`- ルーラーの連鎖: ${dispositorChain(chart)}`);
    const mr = mutualReceptions(chart);
    lines.push(`- 相互リセプション: ${mr.length ? mr.join(" / ") : "なし"}（あれば最重要——2天体が互いの家に住み合う永久循環）`);
    const oddCount = chart.planets.filter((p) => ODD_SIGNS.has(p.signJa)).length;
    lines.push(`- 奇数（外向き）サインの天体: ${oddCount} / 偶数（内向き）: ${chart.planets.length - oddCount}`);
    const dom = chart.planets.filter((p) => RULER_OF[p.signJa] === p.ja).map((p) => `${p.ja}（${p.signJa}）`);
    lines.push(`- 自分のサインにいる天体（品位が高い）: ${dom.length ? dom.join("・") : "なし"}`);
    lines.push("【天体】");
    for (const p of chart.planets) {
      const s = SABIAN[p.absSabian];
      lines.push(`- ${p.ja}${p.retrograde ? "（逆行）" : ""}: ${p.signJa} ${p.degInSign.toFixed(1)}度 / ${p.house}ハウス / サビアン${p.sabianDeg}度「${s ? (s.ja || s.en) : ""}」`);
    }
    const ascS = SABIAN[chart.asc.absSabian];
    lines.push(`- ASC: ${chart.asc.signJa} サビアン${chart.asc.sabianDeg}度「${ascS ? (ascS.ja || ascS.en) : ""}」`);
    if (chart.node && chart.tail) {
      const nS = SABIAN[chart.node.absSabian], tS = SABIAN[chart.tail.absSabian];
      lines.push("【ドラゴンヘッド／テイル（平均ノード）】");
      lines.push(`- ドラゴンヘッド: ${chart.node.signJa} ${chart.node.degInSign.toFixed(1)}度 / ${chart.node.house}ハウス / サビアン${chart.node.sabianDeg}度「${nS ? (nS.ja || nS.en) : ""}」`);
      lines.push(`- ドラゴンテイル: ${chart.tail.signJa} ${chart.tail.degInSign.toFixed(1)}度 / ${chart.tail.house}ハウス / サビアン${chart.tail.sabianDeg}度「${tS ? (tS.ja || tS.en) : ""}」`);
    }
    lines.push("【数秘（生年月日のみ）】");
    lines.push(`- ライフパスナンバー: ${num.lifePath}${num.isMasterLife ? "（マスターナンバー）" : ""}（${num.lifeCalc}）`);
    lines.push(`- バースデーナンバー: ${num.birthday}${num.isMasterBirthday ? "（マスターナンバー）" : ""}（${num.birthdayCalc}）`);
    const pSun = prog.planets.find((p) => p.ja === "太陽");
    const pMoon = prog.planets.find((p) => p.ja === "月");
    const psS = SABIAN[pSun.absSabian], pmS = SABIAN[pMoon.absSabian];
    lines.push(`【プログレス（二次進行・${prog.asOf}時点）】`);
    lines.push(`- 進行太陽: ${pSun.signJa} ${pSun.degInSign.toFixed(1)}度（ネイタル${pSun.house}ハウス）サビアン${pSun.sabianDeg}度「${psS ? (psS.ja || psS.en) : ""}」`);
    lines.push(`- 進行月: ${pMoon.signJa} ${pMoon.degInSign.toFixed(1)}度（ネイタル${pMoon.house}ハウス）サビアン${pMoon.sabianDeg}度「${pmS ? (pmS.ja || pmS.en) : ""}」`);
    const changed = prog.planets
      .filter((pp) => { const nat = chart.planets.find((p) => p.ja === pp.ja); return nat && nat.signJa !== pp.signJa; })
      .map((pp) => { const nat = chart.planets.find((p) => p.ja === pp.ja); return `${pp.ja}（${nat.signJa}→${pp.signJa}）`; });
    lines.push(`- ネイタルからサイン移行済みの進行天体: ${changed.length ? changed.join("、") : "なし"}`);
    lines.push("【アスペクト】");
    if (chart.aspects.length) {
      for (const x of chart.aspects) lines.push(`- ${x.a}－${x.b}: ${x.typeEn}（${x.type}） 誤差${x.orb}度`);
    } else {
      lines.push("- （6度オーブ内のメジャーアスペクトなし）");
    }
    lines.push("");
    lines.push(`それでは、${name ? name + " さん" : "この人"}の取扱説明書を、14章すべて、遠慮せず深く、たっぷりと書いてください。`);
    return lines;
  }

  // フル版（コピー用・仕様書全文同梱＋選択ペルソナの定義を埋め込み）
  function toClaudePrompt(chart, name, personaId) {
    return [ROLE_LINE, ""]
      .concat(personaPromptLines(personaId), [""])
      .concat(promptSpecLines(), [""], promptDataLines(chart, name)).join("\n");
  }

  // コンパクト版（URL用・仕様書は静的URL参照＋要約フォールバック）
  function toClaudePromptCompact(chart, name, personaId) {
    const p = personaOf(personaId);
    const lines = [ROLE_LINE, ""];
    lines.push(`まず ${SPEC_URL} を取得し、そこに書かれた「自分取扱説明書」の生成仕様（14章の構成と文章のルール）に厳密に従ってください。`);
    lines.push(`鑑定士ペルソナ: ${p.emoji}${p.label} — 仕様書の【鑑定士ペルソナ定義】の該当キャラを全文に適用。声の要約=「${p.hint}」。文章ルールは維持したまま、全章をこの声で書く。`);
    lines.push("URLを読み込めない場合は、次の要約ルールで書いてください: 14章=①あなたを一言でいうと ②基本OS ③外から見えるあなた／内側のあなた ④才能が起動する条件 ⑤何度も繰り返す人生パターン ⑥暴走モードと停止モード（共通原因も） ⑦対人関係での取扱注意事項 ⑧仕事での正しい役割 ⑨お金との付き合い方 ⑩持ってきた古い生存戦略（テイル=使い慣れた武器） ⑪これから育てる新しい自分（テイルの力をヘッド方向へ使い直す統合形） ⑫今、人生の何章にいるのか（プログレス=内側の季節） ⑬今やること／やらなくていいこと ⑭最終要約。13章の後に「正直な指摘」（勘違い・周りが言いにくいこと・才能が迷惑になる瞬間・星のせいではないこと、根拠の強いものだけ）。文章ルール=占術用語を実生活に翻訳／長所は必ず「強すぎると◯◯」まで／共感7割・毒3割／断定は根拠量で3段階／矛盾は消さず構造として統合／サビアンは情景として補強のみ／宇宙・魂・波動・過去世・運命といったスピリチュアル権威の語は禁止。");
    lines.push("");
    return lines.concat(promptDataLines(chart, name)).join("\n");
  }

  // web/reading-spec.txt の生成用（Nodeから呼ぶ）
  function specText() {
    return ["サビアンの鏡 — 「自分取扱説明書」生成仕様", ""]
      .concat(promptSpecLines(), [""], personaSpecLines()).join("\n");
  }

  return {
    buildReport, toMarkdown, toClaudePrompt, toClaudePromptCompact, specText, analyze,
    PERSONAS, DEFAULT_PERSONA,
    buildEvidence, buildPersonThemes, buildCoreReading, buildManual, runPipeline,
    numerology, mutualReceptionPairs,
    SIGN_KEYWORDS, ELEMENT_OF, MODALITY_OF, RULER_OF, HOUSE_THEME,
    PLANET_SIGN, PLANET_HOUSE, THEME_JA,
  };
});
