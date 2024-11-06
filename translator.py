import discord
import requests
from discord.ext import commands
from googletrans import Translator
from googletrans.constants import LANGUAGES

API_KEY = 'deepl api key here'

TOKEN = 'discord token here'

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
                    translation = requests.post("https://api-free.deepl.com/v2/translate", data=params).json()
                    embed = discord.Embed(description=translation['translations'][0]['text'], color=0x00ff00)
                    embed.set_footer(text=f"translator: deepl")
                except:
                    translation = translator.translate(message.content, dest='en')
                    embed = discord.Embed(description=translation.text, color=0x00ff00)
                    embed.set_footer(text=f"translator: google")
                    
                embed.set_author(name=message.author.display_name, icon_url=message.author.avatar.url)

                await target_channel.send(embed=embed)

            if message.attachments:
                for attachment in message.attachments:
                    embed = discord.Embed(color=0x00ff00)
                    embed.set_author(name=message.author.display_name, icon_url=message.author.avatar.url)
                    embed.set_image(url=attachment.url)

                    await target_channel.send(embed=embed)

bot.run(TOKEN)
