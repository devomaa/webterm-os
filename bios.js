let rom;
let apis;
let term;
let system;
let colors;
let filesystem = [];

const sleep = (time) => {
  return new Promise(resolve => setTimeout(resolve, time));
}

const wait = (func, time) => {
  return new setTimeout(func, time);
}

let termLocked = false;
const lockTerm = () => {
  return new Promise(resolve => { if (!termLocked) { setTimeout(resolve, 0) } });
}

window.onload = () => {
  if (localStorage.filesystem == "" || localStorage.filesystem == undefined || localStorage.filesystem == null || !localStorage.filesystem) {
    localStorage.filesystem == "[]";
    system.reboot();
  }

  filesystem = JSON.parse(localStorage.filesystem);

  system = {
    reboot: () => { location.href = location.href },
    timezone: {
      date: (x) => { return new Date(x); },
      now: () => { return Date.now(); }
    },
    version: 'WebTerm OS 1.1b'
  };

  colors = {
    red: '#ff4f4f',
    orange: '#ffaf4f',
    yellow: '#ffff4f',
    lime: '#4fff4f',
    green: '#4faf4f',
    lightBlue: '#9f9fff',
    blue: '#4f4fff',
    pink: '#ff4f9f',
    magenta: '#ff4fff',
    purple: '#af4fff',
    brown: '#7f5f45',
    black: '#000000',
    white: '#ffffff',
    lightGray: '#bbbbbb',
    gray: '#666666',
    foreground: '#9f9fff',
    inputForeground: '#ffffff',
    background: '#000000',
  };

  rom = {
    programs: {
      echo: (args) => {
        args = args.join(" ").replace("echo", "");
        if (args !== " ") {
          apis.print(args);
        } else {
          return Error("Não foi informada nenhuma linha de texto.");          
        };
      },
      pause: async (args) => {
        args = args.join(" ").replace("pause", "");
        await sleep(parseInt(args));
      },
      countdown: async (args) => {
        args = args.join(" ").replace("countdown", "");

        apis.print(`<span id="clcdtxt">Linha de comando pausada, esperando ${args} segundo(s)...</span>`);

        while (args >= 1) {
          document.querySelector('#clcdtxt').innerHTML = `Linha de comando pausada, esperando ${args} segundo(s)...`;
          await sleep(1000);
          args--;
        }

        document.querySelector('#clcdtxt').innerHTML = `Linha de comando retomada.`;
        document.querySelector('#clcdtxt').id = "";
      },
      reboot: async (args) => {
        apis.print("Adeus!", colors.foreground);
        await sleep(1000);
        system.reboot();
      },
      eval: async (args) => {
        args = args.join(" ").replace("eval", "");
        let result = eval(args);
        term.write([`<span style="color: ${colors.lightBlue}">[in]:</span>` , ` ${args}`]);
        term.write([`<span style="color: ${colors.green}">[out]:</span>` , ` ${result}`]);
      },
      clear: (args) => {
        apis.screen.innerHTML = null;
      },
      write: async (args) => {
        args = args.join(" ").replace("write ", "");
        if (args == "write" || args == "") {
          apis.print("Você precisa inserir o nome de um arquivo para redigir.", colors.red);
        } else {
          if (filesystem.find(x => x.name === args)) {
            apis.print("Este arquivo já existe.", colors.red);
          } else {
            filesystem.push({
              name: args,
              content: apis.read("Conteúdo do arquivo:")
            });
            apis.fs.flush();
          }
        }
      },
      rewrite: async (args) => {
        args = args.join(" ").replace("rewrite ", "");
        if (args == "rewrite" || args == "") {
          apis.print("Você precisa inserir o nome de um arquivo para editar.", colors.red);
        } else {
          if (filesystem.find(x => x.name === args)) {
            filesystem[filesystem.findIndex(x => x.name === args)] = {
              name: args,
              content: apis.read("Conteúdo do arquivo:", filesystem.find(x => x.name === args).content)
            };
            apis.fs.flush();
          } else {
            apis.print("Este arquivo não existe.", colors.red);            
          }
        }
      },
      rename: async (args) => {
        args = args.join(" ").replace("rename ", "").split(" ");
        if (args[0] == "" || args[1] == "") {
          apis.print("Você precisa inserir o nome de um arquivo e o novo nome para o arquivo..", colors.red);
        } else {
          try {
            let file = filesystem.find(x => x.name === args[0]);
            if (file.name !== args[1]) {
              file.name = args[1];
              apis.print(`${args[0]} renomeado para ${args[1]} com êxito!`, colors.green);
            } else {
              apis.print("Você não pode colocar o nome atual do arquivo.", colors.red);
            }
          } catch (error) {
            apis.print("Arquivo inválido.", colors.red);
          }
        }
      },
      exec: async (args) => {
        args = args.join(" ").replace("exec ", "").split(" ");
        if (args[0] == "-x") {
          args.shift();
          args.forEach(filename => {
            try {
              eval(filesystem.find(x => x.name == filename).content);
            } catch (error) {
              apis.print(`<i>${error}</i>`, colors.red);
            }
          });
        } else if (args[0] == "-a") {
          args.shift();
          args.forEach(filename => {
            try {
              apis.print(`<i>Executando "${filename}" como script assíncrono...</i>`);
              let command = eval(`(async () => { ${filesystem.find(x => x.name == filename).content} })();`);
            } catch (error) {
              apis.print(`<i>Erro na execução de "${filename}": ${error}`, colors.red);
            }
          });
        } else if (args[0] == "-n") {
          args.shift();
          args.forEach(filename => {
            try {
              eval(`(async () => { ${filesystem.find(x => x.name == filename).content} })();`);
            } catch (error) {
              apis.print(`<i>${error}</i>`, colors.red);
            }
          });
        } else {
          args.forEach(filename => {
            try {
              apis.print(`<i>Executando "${filename}" como script...</i>`);
              let command = eval(filesystem.find(x => x.name == filename).content);
              apis.print(`<i>Saída de "${filename}":</i> ${command}`);
            } catch (error) {
              apis.print(`<i>Erro na execução de "${filename}": ${error}`, colors.red);
            }
          });
        }
      },
      rm: async (args) => {
        args = args.join(" ").replace("rm ", "");
        if (args == "rm" || args == "") {
          apis.print("Você precisa inserir o nome de um arquivo.", colors.red);
        } else if (args == "*") {
          filesystem = [];
          apis.fs.flush();
          apis.print("Todos os arquivos removidos.", colors.green);
        } else {
          try {
            let index = filesystem.findIndex(x => x.name === args);
            if (filesystem[index]) {
              filesystem.splice(index, index);
              apis.fs.flush();
              apis.print("Arquivo removido.", colors.green);
            } else {
              apis.print("Arquivo inválido.", colors.red);
            }
          } catch (error) {
            apis.print("Arquivo inválido.", colors.red);
          }
        }
      },
      help: (args) => {
        args = args.join(" ").replace("help", "");        
        term.write([`<span style="color: ${colors.orange}">Ajuda do WebTerm OS</span>`]);
        term.write([`<span style="color: ${colors.blue}">help</span>`, ' Abre esta janela de ajuda']);
        term.write([`<span style="color: ${colors.blue}">cat</span>`, ' Lê um arquivo e retorna o conteúdo']);
        term.write([`<span style="color: ${colors.blue}">ls</span>`, ' Lê o diretório raíz e retorna o conteúdo']);
        term.write([`<span style="color: ${colors.blue}">rm [*]</span>`, ' Remove um arquivo. (usar * remove todos os arquivos)']);
        term.write([`<span style="color: ${colors.blue}">write</span>`, ' Redige um novo arquivo.']);
        term.write([`<span style="color: ${colors.blue}">rewrite</span>`, ' Altera o conteúdo de um arquivo.']);
        term.write([`<span style="color: ${colors.blue}">rename</span>`, ' Altera o nome de um arquivo.']);
        term.write([`<span style="color: ${colors.blue}">exec [-a/-x/-ax]</span>`, ' Executa um arquivo como um script JavaScript.']);
        term.write([`<span style="color: ${colors.foreground}">exec -a</span>`, ' Executa o script assíncronicamente.']);
        term.write([`<span style="color: ${colors.foreground}">exec -x</span>`, ' Executa o script sem informações de depuração.']);
        term.write([`<span style="color: ${colors.foreground}">exec -n</span>`, ' Executa o script assíncronicamente sem informações de depuração.']);
        term.write([`<span style="color: ${colors.foreground}">exec (async)</span>`, ' Scripts assíncronos não suportam saída para a consola de comandos.']);
        term.write([`<span style="color: ${colors.blue}">reboot</span>`, ' Reinicializa o WebTerm OS']);
        term.write([`<span style="color: ${colors.blue}">clear</span>`, ' Limpa a janela']);
        term.write([`<span style="color: ${colors.blue}">eval</span>`, ' Avalia um comando JavaScript']);
        term.write([`<span style="color: ${colors.blue}">echo</span>`, ' Ecoa uma linha de texto']);
        term.write([`<span style="color: ${colors.blue}">pause</span>`, ' Pausa a linha de comandos pelo período de tempo informado']);
        term.write([`<span style="color: ${colors.blue}">countdown</span>`, ' Pausa a linha de comandos e roda uma contagem regressiva.']);
      },
      cat: (args) => {
        args = args.join(" ").replace("cat ", "");
        if (args == "cat" || args == "") {
          apis.print("Você precisa inserir o nome de um arquivo.", colors.red);
        } else {
          try {
            apis.print(filesystem.find(x => x.name === args).content);
          } catch (error) {
            apis.print("Arquivo inválido.", colors.red);
          }
        }        
      },
      ls: (args) => {
        args = args.join(" ").replace("ls", "");
        let items = [];
        
        if (filesystem.length > 0) {
          filesystem.forEach(item => {
            items.push(`${item.name} `);
          });
  
          term.write(items);
          apis.print('');
        } else {
          apis.print("Não há arquivos aqui.", colors.red);
        }
      }
    },
  };

  apis = {
    screen: document.body,
    backdrop: document.firstElementChild,
    fs: {
      flush: () => { localStorage.filesystem = filesystem; }
    },
    read: (text, placeholder) => {
      return prompt(text, placeholder);
    },
    print: (text, color) => {
      if (!color) {
        document.body.innerHTML += `<span style="color: ${colors.inputForeground};">${text}</span>`;
      } else {
        document.body.innerHTML += `<span style="color: ${color};">${text}</span>`;
      }
    },
    submitCommand: async (command) => {
      const args = command.value.split(" ");
      const input = command;

      input.outerHTML = `<span style="color: ${colors.inputForeground};"><code>${command.value}</code></span>`;

      if (rom.programs[args[0]]) {
        try {
          await rom.programs[args[0]](args);
        } catch (error) {
          apis.print(error, colors.red);
        }
      } else {
        apis.print("Programa inexistente.", colors.red);
      }

      apis.print(`<span><span style="color: ${colors.foreground};">&gt;</span> <input autocomplete="off" spellcheck="false" style="color: ${colors.inputForeground};" type="text" onblur="this.focus();" onkeydown="if (event.keyCode == 13) { apis.submitCommand(this); }" autofocus="true" id="cmdin" /></span>`);
      document.querySelector("#cmdin").focus();
    }
  };

  term = {
    write: (texts, color) => {
      if (!color) {
        apis.screen.innerHTML += `<span style="color: ${colors.inputForeground};">${texts.join('')}</span>`;
      } else {
        apis.screen.innerHTML += `<span style="color: ${color};">${texts.join('')}</span>`;
      }
    },
    clear: () => {
      apis.screen.innerHTML = null;
    },
    setBackgroundColor: (color) => {
      apis.screen.style.backgroundColor = color;
      apis.backdrop.style.backgroundColor = color;
      return color;
    },
    setTextColor: (color) => {
      apis.screen.style.color = color;
      return color;
    }
  }
  
  if (!localStorage.osID) {
    localStorage.osID = "00000000".replace(/0/g,function(){return (~~(Math.random()*16)).toString(16);});
  }

  apis.print(`<span><span style="color: ${colors.foreground};">${system.version}</span> (CID: ${localStorage.osID})</span>`);

  if (filesystem.find(x => x.name === "startup.js")) {
    eval(filesystem.find(x => x.name === "startup.js").content);
  }

  apis.print(`<span><span style="color: ${colors.foreground};">&gt;</span> <input autocomplete="off" spellcheck="false" style="color: ${colors.inputForeground};" type="text" onblur="this.focus();" onkeydown="if (event.keyCode == 13) { apis.submitCommand(this); }" autofocus="true" id="cmdin" /></span>`);

  term.setBackgroundColor(colors.background);

  let io = setInterval(() => {
    document.querySelector("#cmdin").focus();
  }, 0, [document.activeElement]);
};

window.onbeforeunload = (e) => {
  localStorage.filesystem = JSON.stringify(filesystem);
};
