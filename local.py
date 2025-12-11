#!/usr/bin/env python3
"""
Local Development Server & Selenium Automation
Features: Anti-detection WebDriver, Event-driven Synchronization, Clean Architecture.
"""

import sys
import logging
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
from typing import Optional

# --- Configuration ---
PORT = 8000
HOST = "localhost"
ROOT_DIR = Path(__file__).parent.resolve()
BASE_URL = f"http://{HOST}:{PORT}"

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("LocalDev")

# --- Selenium Logic ---
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    logger.warning("⚠️ Selenium 未安裝，將跳過瀏覽器自動化。")

def initialize_driver():
    """
    Initializes a stealth ChromeDriver adhering to anti-detection standards.
    """
    options = Options()
    
    # MANDATORY: Anti-detection experimental options
    options.add_experimental_option("detach", True)
    options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
    options.add_experimental_option('useAutomationExtension', False)
    
    # MANDATORY: Command-line arguments
    arguments = [
        "--log-level=3",
        "--disable-blink-features=AutomationControlled",
        "--start-maximized"
    ]
    for arg in arguments:
        options.add_argument(arg)

    return webdriver.Chrome(options=options)

# --- Server Logic ---
class ThreadedServer:
    def __init__(self, host: str, port: int, directory: Path):
        self.server_ready = threading.Event()
        self.httpd: Optional[HTTPServer] = None
        self.host = host
        self.port = port
        self.directory = directory
        self.thread: Optional[threading.Thread] = None

    def _run(self):
        try:
            handler = partial(SimpleHTTPRequestHandler, directory=str(self.directory))
            HTTPServer.allow_reuse_address = True
            self.httpd = HTTPServer((self.host, self.port), handler)
            self.server_ready.set()
            self.httpd.serve_forever()
        except Exception as e:
            logger.error(f"❌ 伺服器啟動失敗: {e}")
            self.server_ready.set()

    def start(self):
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()
        self.server_ready.wait()
        if self.httpd:
            logger.info(f"✅ 伺服器已啟動: {BASE_URL}")
            logger.info(f"📁 根目錄: {self.directory}")

    def stop(self):
        if self.httpd:
            logger.info("正在停止伺服器...")
            self.httpd.shutdown()
            self.httpd.server_close()

# --- Main Execution ---
def main():
    server = ThreadedServer(HOST, PORT, ROOT_DIR)
    driver = None

    try:
        # 1. Start Server
        server.start()

        # 2. Launch Browser
        if SELENIUM_AVAILABLE and server.httpd:
            try:
                logger.info("正在啟動隱身模式 Chrome 瀏覽器...")
                driver = initialize_driver()
                driver.get(BASE_URL)
                logger.info(f"🌐 已導航至: {BASE_URL}")
            except Exception as e:
                logger.error(f"❌ 瀏覽器自動化錯誤: {e}")

        # 3. Keep Alive
        logger.info("按 Ctrl+C 停止程式...")
        threading.Event().wait()

    except KeyboardInterrupt:
        logger.info("\n收到停止訊號 (Ctrl+C)")
    finally:
        if driver:
             # Browser remains open due to 'detach' option
            pass 
        server.stop()
        logger.info("程式已結束")

if __name__ == "__main__":
    main()
