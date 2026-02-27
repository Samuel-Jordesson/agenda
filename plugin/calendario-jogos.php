<?php
/*
Plugin Name: Calendário Jogos Inteligente
Description: Sistema de gerenciamento de jogos com extração automática via IA Gemini.
Version: 4.5
Author: Smart Agenda
*/

if (!defined('ABSPATH')) exit;

/* ===============================
   REGISTRAR CPT
=================================*/
function agenda_register_cpt() {
    register_post_type('jogo', [
        'labels'       => ['name' => 'Jogos', 'singular_name' => 'Jogo'],
        'public'       => true,
        'has_archive'  => true,
        'show_in_rest' => true,
        'show_ui'      => false,
        'show_in_menu' => false,
        'supports'     => ['title'],
    ]);
}
add_action('init', 'agenda_register_cpt');

/* ===============================
   REGISTRAR META FIELDS
=================================*/
function agenda_register_meta_fields() {
    $fields = [
        'dia_jogo'   => ['description' => 'Data do jogo',    'type' => 'string'],
        'hora_jogo'  => ['description' => 'Horário do jogo', 'type' => 'string'],
        'local_jogo' => ['description' => 'Local do jogo',   'type' => 'string'],
    ];

    foreach ($fields as $key => $args) {
        register_post_meta('jogo', $key, [
            'type'         => $args['type'],
            'description'  => $args['description'],
            'single'       => true,
            'show_in_rest' => true,
            'auth_callback'=> function() { return current_user_can('edit_posts'); },
        ]);
    }
}
add_action('init', 'agenda_register_meta_fields');

/* ===============================
   MENU
=================================*/
function agenda_menu_admin() {
    add_menu_page('Jogos IA', 'Jogos IA', 'manage_options', 'agenda-dashboard', 'agenda_dashboard_page', 'dashicons-calendar-alt', 6);
    add_submenu_page('agenda-dashboard', 'Adicionar Novo', 'Adicionar Novo', 'manage_options', 'agenda-add', 'agenda_add_page');
    add_submenu_page('agenda-dashboard', 'Configurações IA', 'Configurações IA', 'manage_options', 'agenda-config', 'agenda_config_page');
    add_submenu_page(null, 'Editar Jogo', 'Editar Jogo', 'manage_options', 'agenda-edit', 'agenda_edit_page');
}
add_action('admin_menu', 'agenda_menu_admin');

/* ===============================
   CONFIGURAÇÕES
=================================*/
function agenda_config_page() {
    if (isset($_POST['agenda_config_nonce']) && wp_verify_nonce($_POST['agenda_config_nonce'], 'agenda_config_save')) {
        update_option('agenda_gemini_key', sanitize_text_field($_POST['gemini_key'] ?? ''));
    }
    $key = esc_attr(get_option('agenda_gemini_key', ''));
    ?>
    <div class="agenda-wrap">
        <div class="ag-header">
            <div>
                <h1 class="ag-title">Configurações IA</h1>
                <p class="ag-subtitle">Configure sua chave da API Gemini para ativar a inteligência.</p>
            </div>
        </div>
        <?php if (isset($_POST['agenda_config_nonce'])): ?>
        <div class="ag-alert ok"><?php echo ag_ico('check'); ?> Configurações salvas!</div>
        <?php endif; ?>
        <div class="ag-form-card">
            <form method="post">
                <?php wp_nonce_field('agenda_config_save', 'agenda_config_nonce'); ?>
                <div class="ag-field">
                    <label class="ag-label">Chave API Gemini</label>
                    <input class="ag-input" type="password" name="gemini_key" value="<?php echo $key; ?>" placeholder="AIzaSy...">
                </div>
                <div class="ag-form-footer">
                    <button type="submit" class="ag-btn"><?php echo ag_ico('save'); ?> Salvar</button>
                </div>
            </form>
        </div>
    </div>
    <?php
}

/* ===============================
   DASHBOARD
=================================*/
function agenda_dashboard_page() {
    $search = isset($_GET['s']) ? sanitize_text_field($_GET['s']) : '';
    $args = ['post_type' => 'jogo', 'posts_per_page' => 20, 'post_status' => ['publish', 'draft']];
    if ($search) $args['s'] = $search;
    $query = new WP_Query($args);
    ?>
    <div class="agenda-wrap">
        <div class="ag-header">
            <div>
                <h1 class="ag-title">Agenda Esportiva</h1>
                <p class="ag-subtitle">Gerencie seus jogos com inteligência artificial.</p>
            </div>
            <a href="<?php echo admin_url('admin.php?page=agenda-add'); ?>" class="ag-btn">
                <?php echo ag_ico('add'); ?> Novo Jogo
            </a>
        </div>

        <div class="ag-card">
            <div class="ag-filters">
                <form method="get" class="ag-search-row">
                    <input type="hidden" name="page" value="agenda-dashboard">
                    <div class="ag-search-wrap">
                        <span class="ag-ico"><?php echo ag_ico('search'); ?></span>
                        <input type="text" name="s" placeholder="Buscar..." value="<?php echo esc_attr($search); ?>">
                    </div>
                </form>
            </div>

            <div class="ag-table-wrap">
                <table class="ag-table">
                    <thead>
                        <tr>
                            <th>Evento</th>
                            <th>Data/Hora</th>
                            <th>Local</th>
                            <th style="text-align:right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php if ($query->have_posts()): while ($query->have_posts()): $query->the_post(); 
                        $id = get_the_ID();
                        $dia = get_post_meta($id, 'dia_jogo', true);
                        $hora = get_post_meta($id, 'hora_jogo', true);
                        $local = get_post_meta($id, 'local_jogo', true);
                    ?>
                        <tr>
                            <td>
                                <div class="ag-game-cell">
                                    <div class="ag-game-icon"><?php echo ag_ico('trophy'); ?></div>
                                    <div class="ag-game-name"><?php the_title(); ?></div>
                                </div>
                            </td>
                            <td>
                                <div class="ag-date"><?php echo $dia ? date('d/m/Y', strtotime($dia)) : '—'; ?></div>
                                <div class="ag-time"><?php echo $hora ?: '—'; ?></div>
                            </td>
                            <td class="ag-local"><?php echo $local ?: '—'; ?></td>
                            <td style="text-align:right">
                                <div class="ag-actions">
                                    <a href="<?php echo admin_url("admin.php?page=agenda-edit&post_id=$id"); ?>" class="ag-act edit"><?php echo ag_ico('edit'); ?></a>
                                    <button class="ag-act del ag-del-btn" data-id="<?php echo $id; ?>" data-nonce="<?php echo wp_create_nonce('agenda_delete_'.$id); ?>"><?php echo ag_ico('delete'); ?></button>
                                </div>
                            </td>
                        </tr>
                    <?php endwhile; wp_reset_postdata(); else: ?>
                        <tr><td colspan="4" class="ag-empty">Nenhum jogo encontrado.</td></tr>
                    <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <?php
}

/* ===============================
   ADICIONAR / EDITAR
=================================*/
function agenda_add_page() { agenda_render_form(); }
function agenda_edit_page() { agenda_render_form(intval($_GET['post_id'] ?? 0)); }

function agenda_render_form($post_id = 0) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && wp_verify_nonce($_POST['agenda_nonce'], 'agenda_save')) {
        $data = [
            'post_type' => 'jogo',
            'post_title' => sanitize_text_field($_POST['titulo']),
            'post_status' => 'publish'
        ];
        if ($post_id) $data['ID'] = $post_id;
        
        $new_id = wp_insert_post($data);
        if ($new_id) {
            update_post_meta($new_id, 'dia_jogo', sanitize_text_field($_POST['dia']));
            update_post_meta($new_id, 'hora_jogo', sanitize_text_field($_POST['hora']));
            update_post_meta($new_id, 'local_jogo', sanitize_text_field($_POST['local']));
            wp_redirect(admin_url('admin.php?page=agenda-dashboard&saved=1'));
            exit;
        }
    }

    $titulo = $post_id ? get_the_title($post_id) : '';
    $dia = $post_id ? get_post_meta($post_id, 'dia_jogo', true) : '';
    $hora = $post_id ? get_post_meta($post_id, 'hora_jogo', true) : '';
    $local = $post_id ? get_post_meta($post_id, 'local_jogo', true) : '';
    ?>
    <div class="agenda-wrap">
        <a href="<?php echo admin_url('admin.php?page=agenda-dashboard'); ?>" class="ag-back"><?php echo ag_ico('back'); ?> Voltar</a>
        <div class="ag-header">
            <h1 class="ag-title"><?php echo $post_id ? 'Editar Jogo' : 'Novo Jogo'; ?></h1>
        </div>
        <div class="ag-form-card">
            <form method="post" id="ag-form-novo-jogo">
                <?php wp_nonce_field('agenda_save', 'agenda_nonce'); ?>
                <div class="ag-field">
                    <label class="ag-label">Título / Descrição Completa</label>
                    <input class="ag-input" type="text" id="titulo" name="titulo" value="<?php echo esc_attr($titulo); ?>" placeholder="Ex: Bahia x Vitória amanhã às 20h no Fonte Nova" required>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="ag-field">
                        <label class="ag-label">Dia</label>
                        <input class="ag-input" type="date" id="dia" name="dia" value="<?php echo esc_attr($dia); ?>">
                    </div>
                    <div class="ag-field">
                        <label class="ag-label">Hora</label>
                        <input class="ag-input" type="time" id="hora" name="hora" value="<?php echo esc_attr($hora); ?>">
                    </div>
                </div>
                <div class="ag-field">
                    <label class="ag-label">Local</label>
                    <input class="ag-input" type="text" id="local" name="local" value="<?php echo esc_attr($local); ?>" placeholder="Estádio ou Endereço">
                </div>
                <div class="ag-form-footer">
                    <button type="submit" id="ag-btn-salvar" class="ag-btn"><?php echo ag_ico('save'); ?> Salvar Jogo</button>
                </div>
            </form>
        </div>
    </div>
    <?php
}

/* ===============================
   AJAX EXCLUIR
=================================*/
add_action('wp_ajax_agenda_delete_jogo', function() {
    $id = intval($_POST['post_id']);
    if (wp_verify_nonce($_POST['nonce'], 'agenda_delete_'.$id) && current_user_can('manage_options')) {
        wp_delete_post($id, true);
        wp_send_json_success();
    }
    wp_send_json_error();
});

/* ===============================
   ASSETS & CSS
=================================*/
add_action('admin_enqueue_scripts', function($hook) {
    if (strpos($hook, 'agenda') === false) return;
    wp_enqueue_script('agenda-js', plugin_dir_url(__FILE__) . 'scripts.js', [], '4.5', true);
    wp_localize_script('agenda-js', 'agendaAI', [
        'ajax_url' => admin_url('admin-ajax.php'),
        'tem_chave' => !empty(get_option('agenda_gemini_key')),
        'gemini_key' => get_option('agenda_gemini_key'),
    ]);
});

function ag_ico($name) {
    $icons = [
        'add' => '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
        'save' => '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>',
        'edit' => '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
        'delete' => '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
        'back' => '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>',
        'trophy' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>',
        'search' => '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
        'check' => '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
    ];
    return $icons[$name] ?? '';
}

add_action('admin_head', function() {
    ?>
    <style>
        .agenda-wrap { --cp: #4f46e5; --cbg: #f8fafc; --csurf: #ffffff; --cbord: #e2e8f0; --ctxt: #1e293b; --cmut: #64748b; font-family: 'Inter', sans-serif; background: var(--cbg); padding: 30px; min-height: 100vh; }
        .ag-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .ag-title { font-size: 24px; font-weight: 700; color: var(--ctxt); margin: 0; }
        .ag-subtitle { color: var(--cmut); margin: 5px 0 0; font-size: 14px; }
        .ag-btn { background: var(--cp); color: white; padding: 10px 20px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; transition: opacity 0.2s; }
        .ag-btn:hover { opacity: 0.9; color: white; }
        .ag-card { background: var(--csurf); border: 1px solid var(--cbord); border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
        .ag-filters { padding: 15px 20px; border-bottom: 1px solid var(--cbord); }
        .ag-search-wrap { position: relative; display: flex; align-items: center; max-width: 300px; }
        .ag-search-wrap .ag-ico { position: absolute; left: 10px; color: var(--cmut); }
        .ag-search-wrap input { padding: 8px 12px 8px 35px; border: 1px solid var(--cbord); border-radius: 6px; width: 100%; }
        .ag-table { width: 100%; border-collapse: collapse; }
        .ag-table th { text-align: left; padding: 12px 20px; background: #f1f5f9; color: var(--cmut); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
        .ag-table td { padding: 15px 20px; border-bottom: 1px solid var(--cbord); color: var(--ctxt); font-size: 14px; }
        .ag-game-cell { display: flex; align-items: center; gap: 12px; }
        .ag-game-icon { width: 36px; height: 36px; background: #eef2ff; color: var(--cp); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .ag-game-name { font-weight: 600; }
        .ag-actions { display: flex; gap: 5px; justify-content: flex-end; }
        .ag-act { width: 32px; height: 32px; border-radius: 6px; border: 1px solid var(--cbord); background: white; display: flex; align-items: center; justify-content: center; color: var(--cmut); cursor: pointer; transition: all 0.2s; }
        .ag-act:hover { border-color: var(--cp); color: var(--cp); }
        .ag-act.del:hover { border-color: #ef4444; color: #ef4444; }
        .ag-form-card { background: white; border: 1px solid var(--cbord); border-radius: 12px; padding: 30px; max-width: 600px; }
        .ag-field { margin-bottom: 20px; }
        .ag-label { display: block; font-size: 14px; font-weight: 600; color: var(--ctxt); margin-bottom: 8px; }
        .ag-input { width: 100%; padding: 10px 12px; border: 1px solid var(--cbord); border-radius: 8px; font-size: 14px; }
        .ag-input:focus { outline: none; border-color: var(--cp); box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
        .ag-back { display: inline-flex; align-items: center; gap: 5px; color: var(--cmut); text-decoration: none; margin-bottom: 20px; font-size: 14px; }
        .ag-alert { padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; }
        .ag-alert.ok { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .ag-empty { text-align: center; padding: 40px; color: var(--cmut); }
    </style>
    <?php
});
