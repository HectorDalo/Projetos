let conexaoEstabelecida = false;
let acessoLiberado = false;
let acessoEmAndamento = false;

const statusSistema = document.querySelector(".status-sistema");

console.log("Portfólio do Hector carregado!");

const titulo = document.querySelector("#titulo-dinamico");

const projetos = [

    {
        nome: "Portfólio Pessoal",

        descricao: "Site desenvolvido para apresentar minha formação, habilidades e projetos na área de tecnologia, utilizando HTML, CSS e JavaScript. O projeto também representa minha evolução prática no desenvolvimento web.",

        tecnologias: "HTML • CSS • JavaScript",

        link: "#"
    },

    {
        nome: "Sistema de Cadastro de Clientes",

        descricao: "Sistema desenvolvido em Python para cadastro e gerenciamento de clientes, utilizando Tkinter para a interface gráfica e JSON para armazenamento dos dados. O projeto foi desenvolvido com foco na aplicação prática de conceitos de programação e orientação a objetos.",
        
        tecnologias: "Python • Tkinter • JSON",
        
        link: "https://github.com/HectorDalo/Portiflio/tree/main/Projetos/Cadastro-Clientes"
    }

];

const listaProjetos = document.querySelector("#listaProjetos");

projetos.forEach(function(projeto) {

    const card = document.createElement("div");

    card.classList.add("projeto");

    card.innerHTML = `
        <h3>${projeto.nome}</h3>

        <p>${projeto.descricao}</p>

        <span>${projeto.tecnologias}</span>

        <a href="${projeto.link}" 
            class="btn-projeto"
            target="_blank">      
            <span class="texto-botao">Ver projeto</span>
        </a>

        <div class="status-projeto"></div>
    `;

    listaProjetos.appendChild(card);

});

const botoesProjeto = document.querySelectorAll(".btn-projeto");

botoesProjeto.forEach(function(botao) {

    botao.addEventListener("click", function(event) {

        event.preventDefault();

        const status = botao.parentElement.querySelector(".status-projeto");

        status.textContent = "> ACESSANDO PROJETO...";
        status.style.opacity = "1";

        setTimeout(function() {
            status.textContent = "> CONEXÃO ESTABELECIDA";
        }, 300);

        setTimeout(function() {
            status.textContent = "> REDIRECIONANDO...";
        }, 600);

        setTimeout(function() {
            window.open(botao.href, "_blank");

            setTimeout(function() {
                status.style.opacity = "0";
        }, 300);

    }, 900);

});

const canaisContato = document.querySelectorAll(".canal-contato");

canaisContato.forEach(function(canal) {

    canal.addEventListener("click", function(event) {

        event.preventDefault();

        const status = canal.parentElement.querySelector(".status-contato");
        const nomeCanal = canal.textContent.trim().toUpperCase();

        status.textContent = "> INICIANDO " + nomeCanal + "...";
        status.style.opacity = "1";

        setTimeout(function() {
            status.textContent = "> CONEXÃO ESTABELECIDA";
        }, 300);

        setTimeout(function() {
            status.textContent = "> REDIRECIONANDO...";
        }, 600);

        setTimeout(function() {
            window.open(canal.href, "_blank");

            setTimeout(function() {
                status.style.opacity = "0";
            }, 300);

        }, 900);

    });

});

});

const tituloDinamico = document.querySelector("#titulo-dinamico");
const textoTitulo = document.querySelector("#texto-titulo");
const simbolos = document.querySelectorAll(".simbolo");

const textosRolagem = [
    "Hector Dalonso",
    "Dev em formação",
    "Dev de sistemas",
];

let indiceRolagem = 0;

textoTitulo.textContent = textosRolagem[indiceRolagem];

setInterval(function() {

    // Saída do texto atual
    tituloDinamico.style.transform = "translateY(-67px)";
    tituloDinamico.style.opacity = "0";

    setTimeout(function() {

        // Próximo texto
        indiceRolagem =
            (indiceRolagem + 1) % textosRolagem.length;

        textoTitulo.textContent =
            textosRolagem[indiceRolagem];

        // Prepara o novo texto para entrar por baixo
        tituloDinamico.style.transition = "none";
        tituloDinamico.style.transform = "translateY(67px)";

        setTimeout(function() {

            // Entrada do novo texto
            tituloDinamico.style.transition =
                "transform 0.6s ease, opacity 0.6s ease";

            tituloDinamico.style.transform =
                "translateY(0)";

            tituloDinamico.style.opacity = "1";

            // Espera o texto terminar de aparecer
            setTimeout(function() {

                // Reinicia a animação dos dois símbolos
                simbolos.forEach(function(simbolo) {
                    simbolo.classList.remove("carregando");
                });

                void tituloDinamico.offsetWidth;

                simbolos.forEach(function(simbolo) {
                    simbolo.classList.add("carregando");
                });

            }, 600);

        }, 50);

    }, 600);

}, 2500);

const terminalInput = document.querySelector("#terminalInput");
const terminalConteudo = document.querySelector(".terminal-conteudo");
const historicoTerminal = document.querySelector("#historicoTerminal");
function mostrarTextoTerminal(texto, classe = "") {
    const linha = document.createElement("p");

    linha.textContent = texto;

    if (classe) {
        linha.classList.add(classe);
    }

    historicoTerminal.appendChild(linha);
}

function mostrarHtmlTerminal(html, classe = "") {
    const linha = document.createElement("p");
    linha.innerHTML = html;

    if (classe) {
        linha.classList.add(classe);
    }

    historicoTerminal.appendChild(linha);
}

function mostrarSecaoTerminal(titulo, conteudo) {
    mostrarHtmlTerminal(`
        <div class="terminal-cabecalho-resposta">
            ${titulo}
        </div>

        <div class="terminal-separador">
            ----------------------------------------
        </div>

        <div class="terminal-corpo-resposta">
            ${conteudo}
        </div>
    `);
}

// Abre um projeto pelo índice do array projetos
function abrirProjetoTerminal(indice) {
    const projeto = projetos[indice];

    if (!projeto) {
        mostrarTextoTerminal("Projeto não encontrado.", "erro-terminal");
        return;
    }

    if (!projeto.link || projeto.link === "#") {
        mostrarTextoTerminal(
            "Este é o próprio portfólio. Você já está visualizando o projeto."
        );
        return;
    }

    mostrarTextoTerminal("> ACESSANDO " + projeto.nome.toUpperCase() + "...");
    mostrarTextoTerminal("> CONEXÃO ESTABELECIDA", "sucesso-terminal");

    setTimeout(function () {
        mostrarTextoTerminal("> REDIRECIONANDO...");
        window.open(projeto.link, "_blank", "noopener,noreferrer");
    }, 700);
}

// Processa os comandos digitados
terminalInput.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") {
        return;
    }

    const comando = terminalInput.value.trim().toLowerCase();

    if (!comando) {
        return;
    }

    mostrarTextoTerminal(
        "hector@portfolio:~$ " + comando,
        "comando-digitado"
    );

    switch (comando) {
        case "help":
        case "ajuda":
        case "comandos":
            mostrarSecaoTerminal(
                "HD. — CURRÍCULO INTERATIVO",
                `
                    <p><strong>perfil</strong> — apresentação profissional</p>
                    <p><strong>formacao</strong> — formação acadêmica</p>
                    <p><strong>cursos</strong> — cursos e certificações</p>
                    <p><strong>habilidades</strong> — competências técnicas</p>
                    <p><strong>experiencia</strong> — histórico profissional</p>
                    <p><strong>objetivo</strong> — objetivo profissional</p>
                    <p><strong>clear</strong> — limpar o terminal</p>
                `
            );
            break;

        case "perfil":
        case "sobre":
            mostrarSecaoTerminal(
                "PERFIL PROFISSIONAL",
                `
                    <p><strong>Nome:</strong> Hector Dalonso</p>
                    <p><strong>Formação:</strong> Ciência da Computação</p>
                    <p><strong>Status:</strong> Desenvolvedor em formação</p>
                    <p><strong>Área de interesse:</strong> Desenvolvimento de software</p>

                    <p class="terminal-paragrafo">
                        Estudante de Ciência da Computação, com interesse em
                        programação, desenvolvimento de sistemas, automação
                        e tecnologia. Busca evoluir por meio de projetos
                        práticos e aprendizado contínuo.
                    </p>
                `
            );
            break;

        case "formacao":
        case "formação":
            mostrarSecaoTerminal(
                "FORMAÇÃO ACADÊMICA",
                `
                    <p><strong>Curso:</strong> Ciência da Computação</p>
                    <p><strong>Situação:</strong> Em andamento</p>
                    <p><strong>Período:</strong> 2º semestre</p>

                    <p class="terminal-subtitulo">FOCO DE APRENDIZADO</p>
                    <p>• Lógica de programação</p>
                    <p>• Desenvolvimento de software</p>
                    <p>• Programação e tecnologia</p>
                `
            );
            break;

        case "habilidades":
        case "skills":
            mostrarSecaoTerminal(
                "COMPETÊNCIAS TÉCNICAS",
                `
                    <p class="terminal-subtitulo">LINGUAGENS E WEB</p>
                    <p>• Python</p>
                    <p>• JavaScript</p>
                    <p>• HTML5</p>
                    <p>• CSS</p>

                    <p class="terminal-subtitulo">CONCEITOS E FERRAMENTAS</p>
                    <p>• Programação Orientada a Objetos</p>
                    <p>• Tkinter</p>
                    <p>• JSON</p>
                    <p>• Lógica de programação</p>

                    <p class="terminal-subtitulo">OUTROS CONHECIMENTOS</p>
                    <p>• Suporte técnico</p>
                    <p>• Manutenção de computadores</p>
                    <p>• Resolução de problemas</p>
                `
            );
            break;
        
        case "cursos":
        case "certificados":
        case "extracurriculares":

            mostrarSecaoTerminal(
                "CURSOS E CERTIFICAÇÕES",
                `
                    <p class="terminal-subtitulo">
                        01 — PROGRAMAÇÃO E TECNOLOGIA
                    </p>

                    <p><strong>Pensamento Computacional</strong></p>
                    <p class="terminal-tecnologias">
                        Fundação Bradesco | Julho de 2026
                    </p>

                    <div class="terminal-espaco"></div>

                    <p><strong>Desenvolvimento Orientado a Objetos Utilizando a Linguagem Python</strong></p>
                    <p class="terminal-tecnologias">
                        Fundação Bradesco | Julho de 2026
                    </p>

                    <div class="terminal-espaco"></div>

                    <p><strong>Introdução à Programação Orientada a Objetos</strong></p>
                    <p class="terminal-tecnologias">
                        Fundação Bradesco | Março de 2026
                    </p>

                    <div class="terminal-espaco"></div>

                    <p><strong>Linguagem de Programação Python — Básico</strong></p>
                    <p class="terminal-tecnologias">
                        Fundação Bradesco | Janeiro de 2026
                    </p>

                    <div class="terminal-espaco"></div>

                    <p><strong>Site Simples Usando HTML, CSS, JavaScript</strong></p>
                    <p class="terminal-tecnologias">
                        Fundação Bradesco | Janeiro de 2026
                    </p>

                    <div class="terminal-espaco"></div>

                    <p class="terminal-subtitulo">
                        02 — CURSOS COMPLEMENTARES
                    </p>

                    <p><strong>Almoxarife</strong></p>
                    <p class="terminal-tecnologias">
                        Bom Curso | 2022
                    </p>

                    <div class="terminal-espaco"></div>

                    <p><strong>Gestão Empresarial</strong></p>
                    <p class="terminal-tecnologias">
                        Start Pró Formação Profissional | 2016
                    </p>

                    <div class="terminal-espaco"></div>

                    <p><strong>Informática</strong></p>
                    <p class="terminal-tecnologias">
                        Start Pró Formação Profissional | 2016
                    </p>

                    <div class="terminal-espaco"></div>

                    <p><strong>Inglês</strong></p>
                    <p class="terminal-tecnologias">
                        Start Pró Formação Profissional | 2016
                    </p>
                `
            );

            break;

        case "experiencia":
        case "experiencias":
        case "experiências":

        mostrarSecaoTerminal("EXPERIÊNCIA PROFISSIONAL", `
            <p><strong>01. Centro Universitário ENIAC</strong></p>
            <p class="terminal-tecnologias">Estagiário em Suporte Técnico de Tecnologia da Informação | Ago/2026 – Atual</p>
            <p>• Desenvolvimento e manutenção de páginas web utilizando HTML e JavaScript.</p>
            <p>• Suporte técnico a computadores, periféricos, laboratórios e Chromebooks.</p>
            <p>• Acompanhamento de chamados técnicos e identificação de problemas.</p>
            <p>• Automação de tarefas, criação de soluções Low Code e colaboração com a equipe de TI.</p>

            <div class="terminal-espaco"></div>

            <p><strong>02. Edu Tintas</strong></p>
            <p class="terminal-tecnologias">Auxiliar de Loja | Nov/2025 – Ago/2026</p>
            <p>• Organização de estoque e preparação de mercadorias para expedição.</p>
            <p>• Utilização de sistemas internos para conferência de pedidos, notas fiscais e liberação de produtos.</p>
            <p>• Acompanhamento de processos digitais e identificação de inconsistências nas informações.</p>

            <div class="terminal-espaco"></div>

            <p><strong>03. Ambev</strong></p>
            <p class="terminal-tecnologias">Técnico de Máquinas de Refrigeração | Nov/2022 – Fev/2023</p>
            <p>• Execução de manutenções preventivas e corretivas.</p>
            <p>• Diagnóstico de falhas e resolução de problemas técnicos em campo.</p>
            <p>• Atendimento de chamados e acompanhamento de ocorrências técnicas.</p>

            <div class="terminal-espaco"></div>

            <p><strong>04. REAL ROSA</strong></p>
            <p class="terminal-tecnologias">Assistente Geral | Set/2016 – Jan/2018</p>
            <p>• Apoio às rotinas operacionais, organização de estoque e atendimento ao cliente.</p>
            <p>• Auxílio na manutenção de computadores e resolução de problemas técnicos.</p>
            <p>• Contato com infraestrutura de rede e suporte básico aos equipamentos.</p>
            <div class="terminal-espaco"></div>

            <p><strong>05. Start Pro</strong></p>
            <p class="terminal-tecnologias">Trainee | Nov/2015 – Fev/2016</p>
            <p>• Orientação e suporte a alunos no uso de ferramentas de informática.</p>
            <p>• Apoio no aprendizado de Word, Excel, PowerPoint e Access.</p>
            <p>• Auxílio na manutenção, configuração de computadores e resolução de problemas.</p>

            <div class="terminal-espaco"></div>

            <p class="terminal-subtitulo">RESUMO PROFISSIONAL</p>
            <p>Experiência em suporte técnico, desenvolvimento web, manutenção de equipamentos, utilização de sistemas e resolução de problemas. Em constante evolução na área de tecnologia, com foco em desenvolvimento de software e aprimoramento das habilidades técnicas.</p>
        `);

        break;

        case "objetivo":
            mostrarSecaoTerminal(
                "OBJETIVO PROFISSIONAL",
                `
                    <p>
                        Desenvolver minha carreira na área de tecnologia,
                        ampliando meus conhecimentos em programação e
                        desenvolvimento de software.
                    </p>

                    <p class="terminal-paragrafo">
                        Busco oportunidades para aplicar meus conhecimentos
                        em projetos práticos, aprender novas tecnologias
                        e contribuir com organização, raciocínio lógico
                        e resolução de problemas.
                    </p>
                `
            );
            break;

        case "clear":
        case "limpar":
            historicoTerminal.innerHTML = "";
            break;

        default:
            mostrarTextoTerminal(
                'Comando não encontrado: "' + comando +
                '". Digite "help" para consultar os comandos.',
                "erro-terminal"
            );
            break;
    }

    // Mantém a linha de entrada no final do terminal.
    const linhaTerminal = document.querySelector(".terminal-linha");

    if (linhaTerminal) {
        terminalConteudo.appendChild(linhaTerminal);
    }

    terminalInput.value = "";
    terminalInput.focus({ preventScroll: true });
});

const statusModulo = document.querySelector("#statusModulo");

const btnAcesso = document.querySelector("#btnAcesso");
const progressoAcesso = document.querySelector("#progressoAcesso");
const porcentagemAcesso = document.querySelector("#porcentagemAcesso");

btnAcesso.addEventListener("click", function() {

    if (acessoEmAndamento || acessoLiberado) {
        return;
    }

    acessoEmAndamento = true;
    btnAcesso.disabled = true;
    btnAcesso.style.display = "none";

    let progresso = 0;

    const animacaoProgresso = setInterval(function() {

        progresso += 1;

        progressoAcesso.style.width = progresso + "%";
        porcentagemAcesso.textContent = progresso + "%";

        if (progresso >= 100) {
        clearInterval(animacaoProgresso);
        }

    }, 90);

    setTimeout(function() {

        statusModulo.textContent =
            "Carregando módulo Sobre. . .";

    }, 1000);
        

    setTimeout(function() {

        statusModulo.textContent =
            "Carregando módulo Habilidades. . .";

    }, 3000);

    setTimeout(function() {

        statusModulo.textContent =
            "Carregando módulo Projetos. . .";

    }, 5000);

    setTimeout(function() {

        statusModulo.textContent =
            "Carregando módulo Terminal. . .";

    }, 7000);

    
setTimeout(function() {
    statusModulo.textContent =
        "Carregando módulo Contato. . .";

}, 9000);

setTimeout(function() {
    statusSistema.textContent = "● SYSTEM ONLINE";
    statusModulo.textContent = "";

    document.querySelector("#acessoPermitido").style.display = "block";

    btnAcesso.style.display = "none";

    porcentagemAcesso.style.opacity = "0";
    porcentagemAcesso.style.transform = "translateY(-10px)";

    setTimeout(function() {
        porcentagemAcesso.style.visibility = "hidden";
    }, 500);

    if (porcentagemAcesso.textContent === "100%") {
        acessoLiberado = true;

        const body = document.querySelector("body");
        body.classList.add("acesso-liberado");

        console.log("ACESSO LIBERADO!");

        const secoes = document.querySelectorAll(
            "#sobre, #habilidades, #projetos, #terminal, #contato"
        );

        secoes.forEach(function(secao) {
            secao.classList.add("secao-animada");
        });

        const observadorSecoes = new IntersectionObserver(
            function(entradas) {
                entradas.forEach(function(entrada) {
                    if (entrada.isIntersecting) {
                        entrada.target.classList.add("visivel");
                    }
                });
            },
            {
                threshold: 0.2
            }
        );

        secoes.forEach(function(secao) {
            observadorSecoes.observe(secao);
        });
    }
}, 9500);

});

const btnConexao = document.querySelector("#btnConexao");
const carregamento = document.querySelector("#carregamento");
const progresso = document.querySelector("#progresso");
const porcentagem = document.querySelector("#porcentagem");
const conexaoSucesso = document.querySelector("#conexaoSucesso");

btnConexao.addEventListener("click", function() {

    btnConexao.style.display = "none";
    carregamento.style.display = "block";
    let valor = 0;

    const intervalo = setInterval(function() {

        valor++;

        progresso.style.width = valor + "%";
        porcentagem.textContent = valor + "%";

        if (valor >= 100) {

            clearInterval(intervalo);

            carregamento.style.display = "none";
            conexaoSucesso.style.display = "block";

            conexaoEstabelecida = true;


}

}, 30);

});

