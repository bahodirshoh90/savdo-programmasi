"""
Settings Service
"""
from sqlalchemy.orm import Session
from models import Settings
from schemas import SettingsUpdate
from typing import Optional


class SettingsService:
    """Service for managing application settings"""
    
    @staticmethod
    def get_settings(db: Session) -> Optional[Settings]:
        """Get current settings (always returns or creates default)"""
        settings = db.query(Settings).filter(Settings.id == 1).first()
        
        if not settings:
            # Create default settings
            try:
                settings = Settings(
                    id=1,
                    store_name="Do'kon",
                    receipt_footer_text="Xaridingiz uchun rahmat!",
                    receipt_show_logo=True,
                    work_start_time="09:00",
                    work_end_time="18:00",
                    work_days="1,2,3,4,5,6,7"
                )
                db.add(settings)
                db.commit()
                db.refresh(settings)
            except Exception as e:
                # If new columns don't exist, create without them
                print(f"Warning: Could not create settings with work schedule fields: {e}")
                try:
                    settings = Settings(
                        id=1,
                        store_name="Do'kon",
                        receipt_footer_text="Xaridingiz uchun rahmat!",
                        receipt_show_logo=True
                    )
                    db.add(settings)
                    db.commit()
                    db.refresh(settings)
                except Exception as e2:
                    print(f"Error creating settings: {e2}")
                    db.rollback()
                    return None
        else:
            # Ensure work schedule fields exist (migration support)
            try:
                if not hasattr(settings, 'work_start_time') or settings.work_start_time is None:
                    settings.work_start_time = "09:00"
                if not hasattr(settings, 'work_end_time') or settings.work_end_time is None:
                    settings.work_end_time = "18:00"
                if not hasattr(settings, 'work_days') or settings.work_days is None:
                    settings.work_days = "1,2,3,4,5,6,7"
                db.commit()
            except Exception as e:
                # If columns don't exist, just continue without them
                print(f"Warning: Work schedule fields not available: {e}")
                db.rollback()
        
        return settings
    
    @staticmethod
    def update_settings(db: Session, settings_update: SettingsUpdate) -> Settings:
        """Update settings"""
        settings = SettingsService.get_settings(db)
        
        # Update fields
        if settings_update.store_name is not None:
            settings.store_name = settings_update.store_name
        if settings_update.store_address is not None:
            settings.store_address = settings_update.store_address
        if settings_update.store_phone is not None:
            settings.store_phone = settings_update.store_phone
        if settings_update.store_email is not None:
            settings.store_email = settings_update.store_email
        if settings_update.store_inn is not None:
            settings.store_inn = settings_update.store_inn
        if settings_update.store_tin is not None:
            settings.store_tin = settings_update.store_tin
        if settings_update.logo_url is not None:
            settings.logo_url = settings_update.logo_url
        if settings_update.receipt_footer_text is not None:
            settings.receipt_footer_text = settings_update.receipt_footer_text
        if settings_update.receipt_show_logo is not None:
            settings.receipt_show_logo = settings_update.receipt_show_logo
        if settings_update.work_start_time is not None:
            settings.work_start_time = settings_update.work_start_time
        if settings_update.work_end_time is not None:
            settings.work_end_time = settings_update.work_end_time
        if settings_update.work_days is not None:
            settings.work_days = settings_update.work_days
        
        db.commit()
        db.refresh(settings)
        
        return settings
    
    @staticmethod
    def is_within_work_hours(db: Session) -> bool:
        """Check if current time is within work hours"""
        from datetime import datetime
        settings = SettingsService.get_settings(db)
        
        # If work schedule is not set, allow all times
        if not settings.work_start_time or not settings.work_end_time:
            return True
        
        try:
            # Get current time
            now = datetime.now()
            current_time = now.strftime("%H:%M")
            current_day = now.weekday() + 1  # Monday = 1, Sunday = 7
            
            # Parse work times
            start_hour, start_min = map(int, settings.work_start_time.split(":"))
            end_hour, end_min = map(int, settings.work_end_time.split(":"))
            
            start_time_minutes = start_hour * 60 + start_min
            end_time_minutes = end_hour * 60 + end_min
            current_time_minutes = now.hour * 60 + now.minute
            
            # Check if within time range
            if start_time_minutes > end_time_minutes:
                # Overnight schedule (e.g., 22:00 to 06:00)
                is_within_time = current_time_minutes >= start_time_minutes or current_time_minutes <= end_time_minutes
            else:
                # Normal schedule
                is_within_time = start_time_minutes <= current_time_minutes <= end_time_minutes
            
            # Check if within work days
            work_days = settings.work_days or "1,2,3,4,5,6,7"
            work_days_list = [int(d.strip()) for d in work_days.split(",")]
            is_within_days = current_day in work_days_list
            
            return is_within_time and is_within_days
        except Exception as e:
            # On error, allow tracking (fail open)
            print(f"Error checking work hours: {e}")
            return True

