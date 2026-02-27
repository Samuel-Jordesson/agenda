document.addEventListener("DOMContentLoaded", function () {

    /* ================================================
       EXCLUIR JOGO — AJAX
    ================================================ */
    document.querySelectorAll(".ag-del-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            if (!confirm("Tem certeza que deseja excluir este jogo?")) return;

            const id = this.dataset.id;
            const nonce = this.dataset.nonce;
            const row = this.closest("tr");

            btn.disabled = true;
            if (row) row.style.opacity = "0.4";

            const fd = new FormData();
            fd.append("action", "agenda_delete_jogo");
            fd.append("post_id", id);
            fd.append("nonce", nonce);

            fetch(agendaAI.ajax_url, { method: "POST", body: fd })
                .then(r => r.json())
                .then(res => {
                    if (res.success) {
                        if (row) row.remove();
                    } else {
                        alert("Erro ao excluir.");
                        btn.disabled = false;
                        if (row) row.style.opacity = "1";
                    }
                })
                .catch(() => {
                    alert("Erro de conexão.");
                    btn.disabled = false;
                    if (row) row.style.opacity = "1";
                });
        });
    });

    /* ================================================
       IA GEMINI — EXTRAÇÃO INTELIGENTE
    ================================================ */
    const form = document.getElementById("ag-form-novo-jogo");
    if (!form || !agendaAI.tem_chave) return;

    async function extrairComIA(texto) {
        const key = agendaAI.gemini_key;
        if (!key) {
            console.error("Agenda IA: Chave API não configurada.");
            return null;
        }

        const hoje = new Date().toLocaleDateString('pt-BR');
        const diaSemana = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });

        const prompt = `Você é um extrator de dados de eventos esportivos. Extraia os dados deste texto: "${texto}".
        Hoje é ${diaSemana}, ${hoje}.
        Retorne APENAS um JSON puro (sem markdown, sem blocos de código) com estes campos:
        {
          "titulo": "nome do evento limpo",
          "dia": "YYYY-MM-DD",
          "hora": "HH:MM",
          "local": "nome do local"
        }
        Se não encontrar um campo, deixe como "".`;

        const body = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 300,
            }
        });

        // Lista de modelos para tentar em ordem de preferência
        const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];
        
        for (const modelName of models) {
            try {
                console.log(`Agenda IA: Tentando modelo ${modelName}...`);
                // Usando v1beta que é o mais compatível com modelos flash
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
                
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: body
                });

                if (res.ok) {
                    const data = await res.json();
                    return processResponse(data);
                } else {
                    const errData = await res.json();
                    console.warn(`Agenda IA: Modelo ${modelName} falhou:`, errData);
                    // Se for erro de chave (400/403), não adianta tentar outros modelos
                    if (res.status === 400 || res.status === 403) {
                        alert("Erro de Autenticação: Verifique se sua chave API está correta e se o faturamento está ativo.");
                        return null;
                    }
                }
            } catch (err) {
                console.error(`Agenda IA: Erro ao tentar ${modelName}:`, err);
            }
        }

        alert("Erro na API Gemini: Nenhum modelo disponível respondeu. Verifique sua chave API no Google AI Studio.");
        return null;
    }

    function processResponse(data) {
        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        // Limpeza agressiva de markdown/lixo
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        // Tenta encontrar o primeiro { e o último } caso a IA mande texto extra
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            text = text.substring(start, end + 1);
        }
        
        console.log("Agenda IA: Resposta processada:", text);
        try {
            const parsed = JSON.parse(text);
            console.log("Agenda IA: Dados extraídos com sucesso:", parsed);
            return parsed;
        } catch (e) {
            console.error("Agenda IA: Falha ao parsear JSON:", text);
            return null;
        }
    }

    /* Intercepta o submit para análise inteligente */
    form.addEventListener("submit", async function (e) {
        const titulo = (document.getElementById("titulo")?.value || "").trim();
        const dia = (document.getElementById("dia")?.value || "").trim();
        const hora = (document.getElementById("hora")?.value || "").trim();
        const local = (document.getElementById("local")?.value || "").trim();

        // Se o usuário preencheu apenas o título, acionamos a IA no momento do clique
        if (titulo && !dia && !hora && !local) {
            e.preventDefault();

            const btn = document.getElementById("ag-btn-salvar");
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = 'Analisando com IA...';

            const resultado = await extrairComIA(titulo);

            if (resultado) {
                if (resultado.titulo) document.getElementById("titulo").value = resultado.titulo;
                if (resultado.dia) document.getElementById("dia").value = resultado.dia;
                if (resultado.hora) document.getElementById("hora").value = resultado.hora;
                if (resultado.local) document.getElementById("local").value = resultado.local;
            }

            // Submete o formulário após preencher os campos
            form.submit();
        }
    });
});
