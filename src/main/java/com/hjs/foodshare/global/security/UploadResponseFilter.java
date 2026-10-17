package com.hjs.foodshare.global.security;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
@Component
public class UploadResponseFilter extends OncePerRequestFilter {
 protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws ServletException,IOException {
  if(request.getRequestURI().startsWith("/uploads/")){
   response.setHeader("Content-Security-Policy","sandbox; default-src 'none'");
   response.setHeader("X-Content-Type-Options","nosniff");
   if(!request.getRequestURI().toLowerCase(java.util.Locale.ROOT).matches("/uploads/[a-z0-9-]+\\.(jpg|jpeg|png|webp|gif)"))response.setHeader("Content-Disposition","attachment");
  }
  chain.doFilter(request,response);
 }
}
