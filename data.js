const SITE_DATA = {
  stacks: [
    {
      label: "Languages",
      skills: ["Kotlin", "Java", "AOSP", "Feature Phone"]
    },
    {
      label: "UI & Frameworks",
      skills: ["Jetpack Compose", "Custom View", "DataBinding / ViewBinding"]
    },
    {
      label: "Architecture & Pattern",
      skills: ["Clean Architecture", "Multi-Module", "MV Whatever"]
    },
    {
      label: "Asynchronous & Network",
      skills: ["Coroutines & Flow", "gRPC", "RxJava", "Retrofit"]
    },
    {
      label: "Persistence & Data",
      skills: ["Room", "DataStore", "Preferences", "SQLite", "Realm"]
    },
    {
      label: "Location & Systems",
      skills: ["Map SDKs", "Bluetooth (BLE/SPP)", "USB (Barcode/Printer)", "Audio Waves", "BSD Socket (TCP/UDP)"]
    },
    {
      label: "DevOps & Infrastructure",
      skills: ["Maven Central Publishing", "GitHub Actions", "Firebase Functions"]
    }
  ],

  careers: [
    {
      company: "현대자동차",
      work_duration: "2023.06 ~ 재직 중",
      position: "Android Engineer",
      open: true,
      summary: "수요응답형 통합 모빌리티 서비스 <strong>셔클(Shucle)</strong> 생태계 개발",
      projects: [
        {
          project: "Shucle Rider (승객 앱)",
          description: "Jetpack Compose 및 gRPC 기반 실시간 위치·지도 특화 승객용 서비스 개발"
        },
        {
          project: "Shucle Driver (기사 앱)",
          description: "운행 및 매칭 관리를 위한 기사용 서비스 개발"
        },
        {
          project: "Shucle Vehicle (차량 정보 앱)",
          description: "차량 디바이스 및 운행 상태 관리 앱 개발"
        }
      ]
    },
    {
      company: "Greenlabs Financial",
      work_duration: "2022.11 ~ 2023.04",
      position: "Android Engineer/Client Leader",
      summary: "농촌향 핀테크 서비스 개발",
      projects: [
        {
          project: "Seed",
          period: "2022.11 ~ 2023.04",
          details: [
            "디자인 시스템 라이브러리화 — Maven Central",
            "멀티모듈 구조"
          ]
        }
      ]
    },
    {
      company: "Weverse Company",
      work_duration: "2020.04 ~ 2022.08",
      position: "Android Engineer",
      projects: [
        {
          project: "Weverse",
          url: "https://play.google.com/store/apps/details?id=co.benx.weverse",
          period: "2020.04 ~ 2020.12",
          description: "글로벌 커뮤니티 앱 개발 (공통 모듈 라이브러리화, 소셜 로그인 변경, 최신 안드로이드 버전 대응)",
        },
        {
          project: "Weverse Shop",
          url: "https://play.google.com/store/apps/details?id=co.benx.weply",
          period: "2020.04 ~ 2022.08",
          description: "글로벌 커머스 앱 개발 (PLCC 카드 및 해외 결제 수단 다수 연동)",
        },
        {
          project: "Weverse Albums",
          url: "https://play.google.com/store/apps/details?id=co.weverse.album",
          period: "2022.04 ~ 2022.06",
          description: "플랫폼 앨범 앱 기초부터 개발 (ExoPlayer 백그라운드/오프라인 재생, CI/CD 환경 구축)",
        },
        {
          project: "Weverse Pickup",
          period: "2020.04 ~ 2022.08",
          description: "공연 현장 B2B — 바코드 리더기, 영수증 프린터 연동",
        },
        {
          project: "기타",
          details: [
            "응원봉 악보 변환기",
            "사내용 앱 — macOS(JavaFX), Web, Chrome Extension",
            "리크루팅용 API — 과제 제공 방식 개선, Firebase Functions(TypeScript)"
          ]
        }
      ]
    },
    {
      company: "Neofect",
      work_duration: "2018.09 ~ 2020.04",
      position: "B2B 서비스 팀장 / Android Engineer",
      projects: [
        {
          project: "Rapael Clinic · Rapael ComCog",
          links: [
            { label: "ComCog", url: "https://www.neofect.com/ko/comcog/" },
            { label: "Rapael", url: "https://www.neofect.com/ko/product/rapael/" },
            { label: "Kids", url: "https://www.neofect.com/ko/product/kids/" },
            { label: "Boards", url: "https://www.neofect.com/ko/product/boards/" }
          ],
          period: "2018.09 ~ 2020.04",
          details: [
            "목적조직 팀장으로서 Rapael Clinic / ComCog 서비스 개발 및 리딩",
            "자사 헬스케어 디바이스 통신 프로토콜 정의 및 최신 안드로이드 기술 스택으로의 전환 주도",
          ]
        }
      ]
    },
    {
      company: "Balance Hero",
      work_duration: "2017.08 ~ 2018.08",
      position: "Android Engineer",
      projects: [
        {
          project: "True Balance",
          url: "https://play.google.com/store/apps/details?id=com.balancehero.truebalance",
          period: "2017.08 ~ 2018.08",
          description: "TrueBalance (인도 핀테크): 디지털 지갑, 인도 현지 본인인증(KYC), 선불 기프트카드 기능 개발",
        }
      ]
    },
    {
      company: "이전 경력",
      projects: [
        {
          project: "ArtNCore",
          period: "2016.09 ~ 2016.12",
          description: "AOSP 기반 네비게이션 단말 시스템 UI 및 미디어 플레이어 개발",
        },
        {
          project: "Soundlly",
          period: "2015.03 ~ 2016.06",
          description: "비가청 음파 수신 라이브러리 개발 및 고객사 연동 지원",
        },
        {
          project: "GoPeace",
          period: "2009.04 ~ 2015.01",
          description: "삼성 기기 간 통신 라이브러리 개발, 안드로이드 단말 및 피처폰 개발",
        },
      ]
    },
  ],

  projects: [
    {
      name: "Android Developer",
      tagline: "안드로이드 개발자를 위한 온디바이스 개발자 툴박스 앱",
      description: "기기·앱 정보 조회, 개발자 옵션 관리, 실시간 로그캣 뷰어, 딥링크/인텐트 테스터, Gradle 의존성 검색 등을 폰 안에서 바로 쓸 수 있는 개발자 도구 앱입니다.",
      platforms: [
        "Android"
      ],
      features: [
        "기기/앱 정보 조회",
        "개발자 옵션 및 디버깅 설정 관리",
        "실시간 로그캣 뷰어",
        "딥링크 / 인텐트 테스터",
        "Gradle 의존성 검색",
        "Quick Launch",
        "QR 코드 생성 및 스캔",
        "라이트 / 다크 / 시스템 테마 지원"
      ],
      downloadUrl: "projects/androiddeveloper/",
      repoUrl: "https://github.com/touktw/AndroidDeveloper",
      license: "Apache License 2.0"
    },
    {
      name: "ADB tools for desktop",
      tagline: "데스크탑용 ADB 툴",
      description: "데스크탑에서 ADB 명령어를 쉽게 실행 가능하게 합니다.",
      platforms: [
        "macOS", "Windows"
      ],
      features: [
        "연결된 디바이스 확인",
        "APK 설치",
        "Deeplink 발송",
        "권한 부여/회수",
        "dumpsys 뷰어",
        "Logcat 뷰어",
        "파일 탐색기",
        "화면 캡쳐/녹화"
      ],
      downloadUrl: "projects/adbtool",
      repoUrl: "https://github.com/touktw/AdbTool",
      license: "Apache License 2.0"
    }
  ],

  key_features: [
    {
      feature: "다양한 도메인 기반의 커뮤니케이션",
      description: "피처폰 및 AOSP부터 헬스케어, 인도/국내 핀테크, 글로벌 소셜/커머스, 현대자동차 모빌리티 서비스까지 폭넓은 도메인 경험을 바탕으로 서비스 전반을 이해하고 다양한 직군과 원활하게 소통합니다."
    },
    {
      feature: "목적조직 리딩 및 유연한 소통",
      description: "목적조직 팀장 경험을 통해 기획, 디자인, 개발, 하드웨어 연동 등 다양한 직군 간의 유연한 비즈니스 소통 및 문제 해결을 주도합니다."
    },
    {
      feature: "유연한 사고를 통한 문제 접근",
      description: "최신 기술(Jetpack Compose, Clean Architecture, MVI, gRPC)부터 하드웨어 통신 프로토콜(BLE/USB/음파/Socket) 및 로우레벨 시스템까지 다각도의 관점에서 유연하게 접근합니다."
    }
  ]
};
