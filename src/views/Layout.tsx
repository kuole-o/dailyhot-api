import type { FC } from "hono/jsx";
import { css, Style } from "hono/css";

interface LayoutProps {
  title: string;
  icon: string;
  description: string;
  keywords: string;
  children?: any;
}

const Layout: FC<LayoutProps> = (props) => {
  const globalClass = css`
    :-hono-global {
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        -webkit-user-drag: none;
      }
      :root {
        --text-color: #333;
        --text-color-gray: #707070;
        --text-color-hover: #fff;
        --icon-color: #444;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --text-color: #fff;
          --text-color-gray: #707070;
          --text-color-hover: #3c3c3c;
          --icon-color: #707070;
        }
      }
      a {
        text-decoration: none;
        color: var(--text-color);
      }
      body {
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-size: 16px;
        color: var(--text-color);
        background-color: var(--text-color-hover);
        font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei";
        transition: color 0.3s, background-color 0.3s;
        overflow: hidden; /* 防止滚动条出现 */
        -webkit-user-select: text; /* Safari */
        -moz-user-select: text; /* Firefox */
        -ms-user-select: text; /* IE10+ */
        user-select: text; /* 标准语法 */
      }
      main {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
        margin: 20px 20px 80px 20px;
        position: absolute;
      }
      @media screen and (max-width: 768px) {
        main {
          margin: 0px 0px 80px 0px;
          padding: 0px;
        }
        .terminal {
          margin-top: 0rem;
        }
      }
      .img {
        width: 120px;
        height: 120px;
        margin-bottom: 20px;
      }
      .img img,
      .img svg {
        width: 100%;
        height: 100%;
      }
      .title {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 40px;
      }
      .title .title-text {
        font-size: 28px;
        font-weight: bold;
        margin-bottom: 12px;
        text-align: center;
      }
      .title .title-tip {
        font-size: 20px;
        opacity: 0.8;
      }
      .content  {
        flex: 1;
      }
      .title .content {
        margin: 20px 0px 0px 0px;
        display: flex;
        padding: 20px;
        border-radius: 12px;
        border: 1px dashed var(--text-color);
        user-select: text;
      }
      .control {
        display: flex;
        flex-direction: row;
        align-items: center;
      }
      .control button {
        display: flex;
        flex-direction: row;
        align-items: center;
        color: var(--text-color);
        border: var(--text-color) solid;
        background-color: var(--text-color-hover);
        border-radius: 8px;
        padding: 8px 12px;
        margin: 0 8px;
        transition: color 0.3s, background-color 0.3s;
        cursor: pointer;
      }
      .control button .btn-icon {
        width: 22px;
        height: 22px;
        margin-right: 8px;
      }
      .control button .btn-text {
        font-size: 14px;
      }
      .control button:hover {
        border: var(--text-color) solid;
        background: var(--text-color);
        color: var(--text-color-hover);
      }
      .control button i {
        margin-right: 6px;
      }
      footer {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        position: relative;
        margin-top: auto;
      }
      .social {
        display: flex;
        flex-direction: row;
        align-items: center;
        margin-bottom: 8px;
      }
      .social .link {
        display: flex;
        flex-direction: row;
        align-items: center;
        margin: 0 4px;
      }
      .social .link::after {
        content: "";
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background-color: var(--text-color);
        opacity: 0.4;
        margin-left: 8px;
      }
      .social .link:last-child::after {
        display: none;
      }
      .social .link svg {
        width: 22px;
        height: 22px;
      }
      footer .power,
      footer .icp {
        font-size: 14px;
      }
      footer a {
        color: var(--text-color-gray);
        transition: color 0.3s;
      }
      footer a:hover {
        color: var(--text-color);
      }

      html {
        height: 100%;
      }
      /* 终端样式 */
      .terminal {
        position: relative;
        margin-top: 10px;
        display: flex; /* 添加flex属性 */
        flex-direction: column; /* 添加flex属性 */
        align-items: center; /* 添加flex属性 */
        justify-content: space-between; /* 添加flex属性 */
      }
      .typewriterContent {
        background-color: #282828;
        border-radius: 10px;
        padding: 10px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        overflow: auto;
        font-family: monospace;
        font-size: 1rem;
        color: #00ff00;
        white-space: pre;
        width: 48rem;
        position: relative;
        transition: all 0.3s ease 0s;
        overflow-x: auto;
      }
      .typewriterContent.fail {
        color: #ffb62c;
      }
      #terminal-output {
        line-height: 1.5rem;
        margin: 30px 6px;
        height: 6rem;
      }
      .control {
        margin-top: 2rem;
        position: relative;
      }
      .control button {
        background-color: var(--text-color-hover);
        border: var(--text-color) solid;
        border-radius: 4px;
        padding: 0.5rem 1.2rem;
        transition: all 0.5s ease;
        margin: 1rem 0.4rem;
        color: var(--text-color);
        cursor: pointer;
        transition: all 0.3s ease 0s;
      }
      .control button:hover {
        border: var(--text-color) solid;
        background: var(--text-color);
        color: var(--text-color-hover);
      }
      .control button i {
        margin-right: 6px;
      }
      /* 工具栏样式 */
      .toolbar {
        display: inline-flex;
        justify-content: left;
        position: absolute;
        width: 100%;
        top: 0;
        left: 0;
        padding: 10px;
        background-color: #3d3d3d;
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
        z-index: 1;
      }
      /* 小圆点样式 */
      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-left: 10px;
      }
      .red {
        background-color: #ff5f56;
      }
      .yellow {
        background-color: #ffbd2e;
      }
      .green {
        background-color: #27c93f;
      }
      @media screen and (max-width: 1024px) {
        body {
          font-size: 24px;
        }
        main.home .img {
          width: 100px;
          height: 100px;
        }
        .ico {
          font-size: 5rem;
          margin: 5rem 2rem 2rem 2rem;
        }
        .title {
          font-size: 14px;
          margin-bottom: 20px;
        }
        .terminal {
          margin-top: 2rem;
        }
        .typewriterContent {
          width: calc(100vw - 22px); /* 计算宽度 */
          overflow-x: auto; /* 横向滚动条 */
          padding: 50px 10px;
        }
        #terminal-output {
          line-height: 1.58rem;
          margin: unset;
        }
        .control button {
          font-size: 1rem;
          margin: 0 6px;
        }
        .control button i {
          margin: unset;
        }
        .control span.btn-text {
          display: none;
        }
        .control button .btn-icon {
          margin-right: unset;
          width: 18px;
          height: 18px;
        }
        footer .power,
        footer .icp {
          font-size: 13px;
        }
        footer .power {
          display: none;
        }   
      }
    }
  `;

  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta charSet="utf-8" />
        <title>{props.title}</title>
        <link rel="icon" href={props.icon} type="image/x-icon"/>
        <meta name="description" content={props.description} />
        <meta name="keywords" content={props.keywords} />
        <Style>{globalClass}</Style>
      </head>
      <body>
        {props.children}
        <footer>
          <div className="social">
            <a
              href="https://github.com/kuole-o/dailyhot-api"
              className="link"
              target="_blank"
              title="本站源码"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33c.85 0 1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
                />
              </svg>
            </a>
            <a href="https://guole.fun/" className="link" target="_blank" title="站长主页">
              <svg
                className="btn-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M10 19v-5h4v5c0 .55.45 1 1 1h3c.55 0 1-.45 1-1v-7h1.7c.46 0 .68-.57.33-.87L12.67 3.6c-.38-.34-.96-.34-1.34 0l-8.36 7.53c-.34.3-.13.87.33.87H5v7c0 .55.45 1 1 1h3c.55 0 1-.45 1-1"
                />
              </svg>
            </a>
            <a href="mailto:guole.fun@qq.com" className="link" title="联系站长">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="m20 8l-8 5l-8-5V6l8 5l8-5m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2"
                />
              </svg>
            </a>
          </div>
          <div className="power">
            Copyright&nbsp;©&nbsp;
            <a href="https://www.imsyy.top/" target="_blank">
              無名
            </a>
            &nbsp;|&nbsp;Power by&nbsp;
            <a href="https://github.com/honojs/hono/" target="_blank">
              Hono
            </a>
          </div>
          <div className="icp">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
            >
              粤 ICP 备 2021063163 号
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
};

export default Layout;
