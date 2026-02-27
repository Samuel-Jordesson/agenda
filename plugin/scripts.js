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

        const prompt = `Você é um extrator de dados de eventos. Extraia os dados deste texto: "${texto}".
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
                topP: 1,
                topK: 1,
                maxOutputTokens: 200,
            }
        });

        // Usando o endpoint v1 estável e o modelo gemini-1.5-flash
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`;

        try {
            console.log("Agenda IA: Iniciando análise...");
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: body
            });

            if (!res.ok) {
                const errData = await res.json();
                console.error("Agenda IA: Erro na API Gemini:", errData);
                
                // Se o modelo 1.5-flash falhar, tentamos o gemini-pro como fallback automático
                if (res.status === 404) {
                    console.log("Agenda IA: Modelo flash não encontrado, tentando gemini-pro...");
                    const fallbackUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${key}`;
                    const fallbackRes = await fetch(fallbackUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: body
                    });
                    
                    if (fallbackRes.ok) {
                        const fallbackData = await fallbackRes.json();
                        return processResponse(fallbackData);
                    }
                }

                alert("Erro na API Gemini: " + (errData.error?.message || "Verifique sua chave API."));
                return null;
            }

            const data = await res.json();
            return processResponse(data);
        } catch (err) {
            console.error("Agenda IA: Erro na requisição:", err);
            alert("Erro ao conectar com a IA. Verifique o console do navegador.");
            return null;
        }
    }

    function processResponse(data) {
        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        // Limpeza de markdown se houver
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        console.log("Agenda IA: Resposta bruta:", text);
        const parsed = JSON.parse(text);
        console.log("Agenda IA: Dados extraídos:", parsed);
        return parsed;
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
