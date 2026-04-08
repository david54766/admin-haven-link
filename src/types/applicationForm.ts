export interface ApplicationFormField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'textarea' | 'email' | 'phone' | 'select' | 'checkbox' | 'center_select';
  field_options: string[];
  placeholder: string | null;
  is_required: boolean;
  is_enabled: boolean;
  is_system_field: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ApplicationNotificationRecipient {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
}
