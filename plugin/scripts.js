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
        const hoje = new Date().toLocaleDateString('pt-BR');
        const diaSemana = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });

        const prompt = `Extraia os dados do evento deste texto: "${texto}".
        Hoje é ${diaSemana}, ${hoje}.
        Retorne APENAS um JSON puro com os campos: titulo, dia (formato YYYY-MM-DD), hora (formato HH:MM), local.
        Se um campo não for encontrado, use "".`;

        const body = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1
            }
        });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: body
            });
            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            return JSON.parse(text);
        } catch (err) {
            console.error("Erro IA:", err);
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
