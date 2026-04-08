-- Allow admins to insert certificates for staff
CREATE POLICY "Admins can insert staff certificates"
ON public.staff_certificates
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Allow admins to update staff certificates
CREATE POLICY "Admins can update staff certificates"
ON public.staff_certificates
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));