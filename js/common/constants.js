var commonConstants = {
    alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    events: {
        chat: {
            session: {
                NETWORK_CONNECTION_ERROR: 'network_connection_error',
                NETWORK_CONNECTION_ESTABLISHED: 'network_connection_established',
                SECURE_FORM_CANCEL: 'chat_session_secure_form_cancel',
                SECURE_FORM_SHOW: 'chat_session_secure_form_show',
                SECURE_FORM_DATA: 'chat_session_secure_form_data',
                FORM_DATA: 'chat_session_form_data',
                FORM_DATA_CANCEL: 'chat_form_data_cancel',
                INFO: 'chat_session_info',
                TYPING: 'chat_session_typing',
                NOT_TYPING: 'chat_session_not_typing',
                FORM_SHOW: 'chat_session_form_show',
                STATUS: 'chat_session_status',
                ENDED: 'chat_session_ended',
                PARTY_JOINED: 'chat_session_party_joined',
                PARTY_LEFT: 'chat_session_party_left',
                MESSAGE: 'chat_session_message',
                FILE: 'chat_session_file',
                TIMEOUT_WARNING: 'chat_session_timeout_warning',
                INACTIVITY_TIMEOUT: 'chat_session_inactivity_timeout',
                LOCATION: 'chat_session_location',
                NAVIGATION: 'chat_session_navigation',
                END: 'chat_session_end',
                DISCONNECT: 'chat_session_disconnect',
                SIGNALING: 'chat_session_signaling',
                COBROWSING_REQUESTED: 'chat_session_cobrowsing_requested',
                COBROWSING_REJECTED: 'chat_session_cobrowsing_rejected',
                COBROWSING_STARTED: 'chat_session_cobrowsing_started',
                COBROWSING_ENDED: 'chat_session_cobrowsing_ended',
                CASE_SET: 'chat_session_case_set',
                FILE_URL: 'chat_session_file_url',
                DIRECTIVE_FILE_URL: 'chat_session_directive_file_url',
                EDIT_MESSAGE: 'chat_session_message_edit',
                DELETE_MESSAGE: 'chat_session_message_delete'
            },
            actions: {
                HIDE: 'hide'
            }
        },
    }
};
