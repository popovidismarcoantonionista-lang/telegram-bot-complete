#!/usr/bin/env python3  
# -*- coding: utf-8 -*-  
"""  
Bot de IA - Versão Render  
Pagamentos Automáticos PixIntegra  
"""  
  
import os  
import sys  
import json  
import time  
import hashlib  
import requests  
import logging  
import asyncio  
from threading import Thread  
from datetime import datetime, timedelta  
from dotenv import load_dotenv  
from flask import Flask, jsonify  
from telegram import Update  
from telegram.ext import (  
    Application,  
    CommandHandler,  
    ContextTypes,  
)  
  
load_dotenv()  
  
logging.basicConfig(  
    level=logging.INFO,  
    format="%(asctime)s - %(levelname)s - %(message)s",  
    handlers=[logging.StreamHandler(sys.stdout)],  
)  
logger = logging.getLogger(__name__)  
  
# Flask para health check do Render  
flask_app = Flask(__name__)  
  
  
@flask_app.route("/")  
def home():  
    return jsonify(  
        {  
            "status": "online",  
            "bot": "AI Content Bot",  
            "timestamp": datetime.now().isoformat(),  
        }  
    )  
  
  
@flask_app.route("/health")  
def health():  
    return jsonify({"status": "healthy", "checks": "passing"})  
  
  
# Config  
class Config:  
    BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")  
    OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "")  
    PIX_TOKEN = os.getenv("PIXINTEGRA_API_TOKEN", "")  
    PIX_KEY = os.getenv("PIXINTEGRA_API_KEY", "")  
    PIX_URL = "https://pixintegra.com.br/api"  
    PORT = int(os.getenv("PORT", 10000))  # Porta que o Render usa  
    CHECK_INTERVAL = 10  # segundos entre verificações  
    PRICES = {"text": 0.05, "image": 0.12}  # se quiser usar depois  
  
  
# Database simples em JSON  
class Database:  
    def __init__(self):  
        self.file = "bot_database.json"  
        self.data = self._load()  
  
    def _load(self):  
        if os.path.exists(self.file):  
            try:  
                with open(self.file, "r", encoding="utf-8") as f:  
                    return json.load(f)  
            except Exception:  
                pass  
        return {"users": {}, "payments": {}}  
  
    def _save(self):  
        with open(self.file, "w", encoding="utf-8") as f:  
            json.dump(self.data, f, indent=2, ensure_ascii=False)  
  
    def get_user(self, uid):  
        uid = str(uid)  
        if uid not in self.data["users"]:  
            self.data["users"][uid] = {  
                "balance": 0.0,  
                "purchases": [],  
                "created": datetime.now().isoformat(),  
            }  
            self._save()  
        return self.data["users"][uid]  
  
    def add_balance(self, uid, amount: float):  
        user = self.get_user(uid)  
        user["balance"] += amount  
        self._save()  
        logger.info(f"💰 +R$ {amount:.2f} user {uid}")  
  
    def deduct_balance(self, uid, amount: float) -> bool:  
        user = self.get_user(uid)  
        if user["balance"] >= amount:  
            user["balance"] -= amount  
            self._save()  
            return True  
        return False  
  
    def create_payment(self, pid: str, uid, amount: float):  
        self.data["payments"][pid] = {  
            "user_id": str(uid),  
            "amount": amount,  
            "status": "pending",  
            "created": datetime.now().isoformat(),  
            "expires": (datetime.now() + timedelta(minutes=30)).isoformat(),  
        }  
        self._save()  
        logger.info(f"💳 Pagamento criado: {pid}")  
  
    def complete_payment(self, pid: str):  
        if pid in self.data["payments"]:  
            p = self.data["payments"][pid]  
            p["status"] = "completed"  
            self.add_balance(p["user_id"], p["amount"])  
            self._save()  
            return p  
        return None  
  
    def get_pending_payments(self):  
        pending = []  
        now = datetime.now()  
        for pid, p in self.data["payments"].items():  
            if p["status"] == "pending":  
                exp = datetime.fromisoformat(p["expires"])  
                if now < exp:  
                    pending.append((pid, p))  
        return pending  
  
  
db = Database()  
  
  
# PixIntegra  
class PixIntegra:  
    @staticmethod  
    def create(amount: float, name: str, email: str, cpf: str):  
        """  
        Cria cobrança Pix  
        """  
        if not Config.PIX_TOKEN or not Config.PIX_KEY:  
            # Modo mock: não gera cobrança real  
            return {  
                "ok": True,  
                "mock": True,  
                "id": f"MOCK-{int(time.time())}",  
                "code": "MOCK_CODE",  
            }  
  
        try:  
            r = requests.post(  
                f"{Config.PIX_URL}/gerar_pix",  
                json={  
                    "api_token": Config.PIX_TOKEN,  
                    "api_key": Config.PIX_KEY,  
                    "nome_do_produto": f"Recarga R$ {amount:.2f}",  
                    "tempo_expiracao": 1800,  
                    "valor_do_produto": amount,  
                    "nome_do_cliente": name,  
                    "email_do_cliente": email,  
                    "cpf_ou_cnpj_do_cliente": cpf,  
                },  
                timeout=30,  
            )  
  
            if r.status_code == 200:  
                d = r.json()  
                return {  
                    "ok": True,  
                    "id": d.get("identificador_cliente"),  
                    "url": d.get("url_qrcode"),  
                    "code": d.get("pix_copia_e_cola"),  
                }  
        except Exception as e:  
            logger.error(f"Erro ao criar pagamento Pix: {e}")  
        return {"ok": False}  
  
    @staticmethod  
    def check(pid: str):  
        """  
        Consulta status do pagamento  
        """  
        if not Config.PIX_TOKEN or not Config.PIX_KEY:  
            return {"ok": True, "paid": False}  
  
        try:  
            r = requests.post(  
                f"{Config.PIX_URL}/consultar_pagamento",  
                json={  
                    "api_token": Config.PIX_TOKEN,  
                    "api_key": Config.PIX_KEY,  
                    "identificador_cliente": pid,  
                },  
                timeout=10,  
            )  
  
            if r.status_code == 200:  
                status = r.json().get("status", "").lower()  
                return {  
                    "ok": True,  
                    "paid": status in ["paid", "pago", "completed", "confirmado"],  
                }  
        except Exception as e:  
            logger.error(f"Erro ao consultar pagamento {pid}: {e}")  
        return {"ok": False}  
  
  
# Payment Checker  
class PaymentChecker:  
    def __init__(self, app: Application):  
        self.app = app  
        self.running = False  
  
    async def notify(self, uid: str, msg: str):  
        try:  
            await self.app.bot.send_message(  
                chat_id=int(uid), text=msg, parse_mode="Markdown"  
            )  
        except Exception as e:  
            logger.error(f"Erro ao notificar usuário {uid}: {e}")  
  
    async def check(self):  
        pending = db.get_pending_payments()  
        if pending:  
            logger.info(f"🔍 Verificando {len(pending)} pagamento(s) pendente(s)...")  
  
        for pid, payment in pending:  
            result = PixIntegra.check(pid)  
            if result.get("ok") and result.get("paid"):  
                logger.info(f"🎉 PAGAMENTO CONFIRMADO: {pid}")  
                p = db.complete_payment(pid)  
                if p:  
                    user = db.get_user(p["user_id"])  
                    await self.notify(  
                        p["user_id"],  
                        (  
                            "✅ **Pagamento Confirmado!**\n\n"  
                            f"💰 R$ {p['amount']:.2f}\n"  
                            f"💵 Saldo: R$ {user['balance']:.2f}\n\n"  
                            "Use /saldo para conferir."  
                        ),  
                    )  
  
    async def run(self):  
        self.running = True  
        logger.info("🔄 Verificação automática ATIVA!")  
        while self.running:  
            try:  
                await self.check()  
                await asyncio.sleep(Config.CHECK_INTERVAL)  
            except Exception as e:  
                logger.error(f"Erro no loop de verificação: {e}")  
                await asyncio.sleep(5)  
  
  
# Handlers Telegram  
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):  
    user = update.effective_user  
    data = db.get_user(user.id)  
    await update.message.reply_text(  
        (  
            "🤖 **Bot de IA Ultra Competitivo**\n\n"  
            f"Olá, {user.first_name}!\n\n"  
            f"💰 Saldo: R$ {data['balance']:.2f}\n\n"  
            "**Comandos:**\n"  
            "/pagar <valor> - Recarregar\n"  
            "/saldo - Ver saldo\n"  
        ),  
        parse_mode="Markdown",  
    )  
  
  
async def saldo(update: Update, context: ContextTypes.DEFAULT_TYPE):  
    data = db.get_user(update.effective_user.id)  
    await update.message.reply_text(  
        (  
            "💰 **Saldo Atual**\n\n"  
            f"R$ {data['balance']:.2f}\n"  
            f"🛒 Compras: {len(data['purchases'])}"  
        ),  
        parse_mode="Markdown",  
    )  
  
  
async def pagar(update: Update, context: ContextTypes.DEFAULT_TYPE):  
    if not context.args:  
        await update.message.reply_text("❌ Use: /pagar 10")  
        return  
  
    try:  
        amount = float(context.args[0])  
        if amount < 1:  
            await update.message.reply_text("❌ Valor mínimo: R$ 1,00")  
            return  
    except ValueError:  
        await update.message.reply_text("❌ Valor inválido. Use: /pagar 10")  
        return  
  
    user = update.effective_user  
  
    result = PixIntegra.create(  
        amount=amount,  
        name=user.first_name or "User",  
        email=user.username or "user@telegram",  
        cpf="00000000000",  
    )  
  
    if not result.get("ok"):  
        await update.message.reply_text("❌ Erro ao criar pagamento Pix.")  
        return  
  
    pid = result["id"]  
    db.create_payment(pid, user.id, amount)  
  
    msg = (  
        "💳 **Pagamento Criado!**\n\n"  
        f"💰 Valor: R$ {amount:.2f}\n"  
        "⏰ Expira em: 30 minutos\n"  
        f"🆔 ID: `{pid}`\n\n"  
    )  
  
    if result.get("mock"):  
        msg += "⚠️ *MODO TESTE*: configure PixIntegra para pagamentos reais.\n"  
    else:  
        if result.get("code"):  
            msg += f"📱 *Pix Copia e Cola:*\n`{result['code']}`\n\n"  
        if result.get("url"):  
            msg += f"🔗 [Ver QR Code]({result['url']})\n\n"  
  
    msg += "🔄 Verificando automaticamente...\nVocê será notificado quando for confirmado!"  
    await update.message.reply_text(msg, parse_mode="Markdown")  
  
  
# Main  
def main():  
    if not Config.BOT_TOKEN:  
        logger.error("❌ TELEGRAM_BOT_TOKEN não configurado!")  
        return  
  
    logger.info("🚀 Iniciando bot...")  
  
    # Telegram Application  
    app = Application.builder().token(Config.BOT_TOKEN).build()  
    app.add_handler(CommandHandler("start", start))  
    app.add_handler(CommandHandler("saldo", saldo))  
    app.add_handler(CommandHandler("pagar", pagar))  
  
    # Payment checker em background  
    checker = PaymentChecker(app)  
  
    def run_checker():  
        asyncio.run(checker.run())  
  
    Thread(target=run_checker, daemon=True).start()  
  
    # Flask para health check no Render  
    def run_flask():  
        logger.info(f"🌐 Flask rodando na porta {Config.PORT}")  
        flask_app.run(host="0.0.0.0", port=Config.PORT)  
  
    Thread(target=run_flask, daemon=True).start()  
  
    logger.info("🤖 Bot ONLINE!")  
    logger.info("🔄 Verificação automática ATIVA!")  
  
    # Rodar bot Telegram (long polling)  
    app.run_polling()  
  
  
if __name__ == "__main__":  
    main()
