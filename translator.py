import os
import discord
import requests
from discord.ext import commands
from googletrans import Translator
from googletrans.constants import LANGUAGES
import traceback

API_KEY = "deepl api here"
TOKEN = "discord token here"

channels = [
    [1302959204713107476, 1302959216335519794],
    [1132591230740606986, 1301795592153862185],
    [973213628050341938, 1301796183148073023],
    [1002136403666272317, 1301796497402368041]
]

intents = discord.Intents.default()
intents.messages = True
intents.message_content = True
intents.guilds = True

bot = commands.Bot(command_prefix="!", intents=intents)
translator = Translator()

@bot.event
async def on_ready():
    print(f'{bot.user} がオンラインになりました！')

@bot.event
async def on_message(message):
    if message.author == bot.user or message.guild is None:
        return

    for source_channel_id, target_channel_id in channels:
        if message.channel.id == source_channel_id:
            target_channel = bot.get_channel(target_channel_id)
            if not target_channel:
                return

            if message.content:
                try:
                    params = {'auth_key': API_KEY, 'text': message.content, 'target_lang': 'EN'}
                    response = requests.post("https://api-free.deepl.com/v2/translate", data=params, timeout=5)
                    response.raise_for_status()
                    translation = response.json()
                    translated_text = translation['translations'][0]['text']
                    embed = discord.Embed(description=translated_text, color=0x00ff00)
                    embed.set_footer(text="translator: deepl")

                except Exception as e:
                    try:
                        translation = translator.translate(message.content, dest='en')
                        translated_text = translation.text
                        embed = discord.Embed(description=translated_text, color=0x00ff00)
                        embed.set_footer(text="translator: google")
                    except Exception as e:
                        error_message = f"Translation failed: {str(e)}"
                        embed = discord.Embed(description=error_message, color=0xff0000)

                    print("Error during translation:", traceback.format_exc())

                embed.set_author(name=message.author.display_name, icon_url=message.author.avatar.url)

                try:
                    await target_channel.send(embed=embed)
                except Exception as e:
                    await message.channel.send(f"Failed to send translated message: {str(e)}")

            if message.attachments:
                for attachment in message.attachments:
                    embed = discord.Embed(color=0x00ff00)
                    embed.set_author(name=message.author.display_name, icon_url=message.author.avatar.url)
                    embed.set_image(url=attachment.url)

                    try:
                        await target_channel.send(embed=embed)
                    except Exception as e:
                        await message.channel.send(f"Failed to send attachment: {str(e)}")

try:
    bot.run(TOKEN)
except Exception as e:
    print("Bot encountered an error during runtime:", traceback.format_exc())
