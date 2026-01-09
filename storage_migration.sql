INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY " Acesso Publico Documentos\ ON storage.objects FOR SELECT USING (bucket_id = 'documentos');
CREATE POLICY \Upload Documentos Autenticado\ ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documentos');
