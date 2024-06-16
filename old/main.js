// 跟随系统主题
const darkModeMediaQuery = window.matchMedia(
  "(prefers-color-scheme: dark)"
);
const toggleDarkMode = (darkModeMediaQuery) => {
  if (darkModeMediaQuery.matches) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};
darkModeMediaQuery.addEventListener("change", toggleDarkMode);
toggleDarkMode(darkModeMediaQuery);

// 获取全部接口列表
async function fetchData() {
  try {
    const response = await fetch("/all");
    const data = await response.json();

    if (data && data.routes) {
      // 过滤掉 path 为 null 的对象，并提取 path
      const paths = data.routes
        .filter(route => route.path !== null)
        .map(route => route.path);

      return paths;
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }

  return null;
}

// 随机选择 path
async function getRandomPathAndLog() {
  const allPaths = await fetchData();
  if (allPaths && allPaths.length > 0) {
    const randomIndex = Math.floor(Math.random() * allPaths.length);
    const randomPath = allPaths[randomIndex];
    if (randomPath) {
      return randomPath;
    } else {
      return "/weibo?limit=5"
    }
  }
}

// 按钮事件
const clickFunction = async (type) => {
  let url;
  switch (type) {
    case 1: url = await getRandomPathAndLog();
      break;
    case 2: url = "/all";
      break;
  }
  window.location.href = url;
};

// 模拟终端效果
const terminalOutput = document.getElementById('terminal-output');
const time = new Date();
let terminalText, type, speed;
let path = window.location.pathname;
if (path === "/") {
  terminalText = `Hello World!\n服务已正常运行...\n\n${time}\n`;
  type = 1;
  speed = 50;
} else {
  terminalText = `出错了！\n请检查您的调用路径与调用方法...\n\n${time}\n`;
  type = 2;
  speed = 20;
}
const printTerminalText = () => {
  let index = 0;
  const printChar = () => {
    if (index < terminalText.length) {
      terminalOutput.textContent += terminalText[index];
      index++;
      setTimeout(printChar, speed);
    }
  };
  printChar();
};

document.addEventListener('DOMContentLoaded', function () {
  printTerminalText();
})