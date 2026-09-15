import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";

const browserPort = 9333;
const previewUrl = "http://127.0.0.1:3000/products/junction-long-sleeve";
const profileDir = "/tmp/terrace-order-request-visual";
const outputDir = "/home/ubuntu/screenshots";
const cart = [{ key: "junction-ls-Ink-M", product: { id: "junction-ls", slug: "junction-long-sleeve", name: "Junction Long Sleeve", collection: "The 90s Study", price: 1888000, image: "/manus-storage/terrace-junction-v2_75e8572e.jpg", gallery: [], colors: ["Ink"], sizes: ["M"], material: "260gsm cotton-blend interlock", fit: "Relaxed", story: "", details: [], publishedAt: "2026-01-06" }, color: "Ink", size: "M", quantity: 1 }];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitForDebugging() { for (let i = 0; i < 30; i += 1) { try { await fetch(`http://127.0.0.1:${browserPort}/json/version`); return; } catch { await delay(200); } } throw new Error("Chromium debugging endpoint did not start."); }
async function openConnection() {
  const targets = await (await fetch(`http://127.0.0.1:${browserPort}/json/list`)).json();
  const target = targets.find(item => item.type === "page");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map(); let sequence = 0;
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  socket.addEventListener("message", event => { const message = JSON.parse(event.data); if (message.id) { const pendingCall = pending.get(message.id); if (!pendingCall) return; pending.delete(message.id); message.error ? pendingCall.reject(new Error(message.error.message)) : pendingCall.resolve(message.result); } else if (message.method === "Fetch.requestPaused" && message.params.request.url.includes("/api/trpc/orderRequests.create")) { call("Fetch.fulfillRequest", { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: "content-type", value: "application/json" }], body: Buffer.from(JSON.stringify({ result: { data: { json: { reference: "TR-READY123", subtotal: 1888000 } } } })).toString("base64") }).catch(() => {}); } });
  return { socket, call };
}
async function captureState(name, mobile) {
  const { socket, call } = await openConnection();
  await call("Page.enable"); await call("Runtime.enable"); await call("Fetch.enable", { patterns: [{ urlPattern: "*api/trpc/orderRequests.create*" }] });
  if (mobile) await call("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `localStorage.setItem('terrace-cart-v1', ${JSON.stringify(JSON.stringify(cart))});` });
  await call("Page.navigate", { url: previewUrl }); await delay(1400);
  await call("Runtime.evaluate", { expression: "document.querySelector('button[aria-label^=\"Shopping bag\"]').click()" }); await delay(250);
  await call("Runtime.evaluate", { expression: "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Request these pieces')).click()" }); await delay(250);
  const formShot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(`${outputDir}/${name}-form.png`, Buffer.from(formShot.data, "base64"));
  const fields = [["customerName", "Visual Check"], ["email", "visual-check@example.com"], ["phone", "+62000000000"]];
  const fillScript = `const entries=${JSON.stringify(fields)}; for (const [name,value] of entries) { const input=document.querySelector('[name='+name+']'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); } document.querySelector('form.request-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));`;
  await call("Runtime.evaluate", { expression: fillScript }); await delay(450);
  const confirmationShot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(`${outputDir}/${name}-confirmation.png`, Buffer.from(confirmationShot.data, "base64"));
  socket.close();
}

await rm(profileDir, { recursive: true, force: true }); await mkdir(outputDir, { recursive: true });
const chromium = spawn("/usr/bin/chromium", ["--headless=new", `--remote-debugging-port=${browserPort}`, "--no-sandbox", "--disable-gpu", `--user-data-dir=${profileDir}`, "about:blank"], { stdio: "ignore" });
try { await waitForDebugging(); await captureState("order-request-desktop", false); await captureState("order-request-mobile", true); console.log("Order request visual captures created."); } finally { chromium.kill("SIGTERM"); }
