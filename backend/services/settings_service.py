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
                    work_days="1,2,3,4,5,6,7",
                    enable_referals=True,
                    enable_loyalty=True,
                    enable_price_alerts=True,
                    enable_favorites=True,
                    enable_tags=True,
                    enable_reviews=True,
                    referal_bonus_points=100,
                    referal_bonus_percent=5.0,
                    loyalty_points_per_sum=0.01,
                    loyalty_point_value=1.0,
                    enable_location_selection=True,
                    enable_offline_orders=True
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
                if not hasattr(settings, 'enable_referals') or settings.enable_referals is None:
                    settings.enable_referals = True
                if not hasattr(settings, 'enable_loyalty') or settings.enable_loyalty is None:
                    settings.enable_loyalty = True
                if not hasattr(settings, 'enable_price_alerts') or settings.enable_price_alerts is None:
                    settings.enable_price_alerts = True
                if not hasattr(settings, 'enable_favorites') or settings.enable_favorites is None:
                    settings.enable_favorites = True
                if not hasattr(settings, 'enable_tags') or settings.enable_tags is None:
                    settings.enable_tags = True
                if not hasattr(settings, 'enable_reviews') or settings.enable_reviews is None:
                    settings.enable_reviews = True
                if not hasattr(settings, 'referal_bonus_points') or settings.referal_bonus_points is None:
                    settings.referal_bonus_points = 100
                if not hasattr(settings, 'referal_bonus_percent') or settings.referal_bonus_percent is None:
                    settings.referal_bonus_percent = 5.0
                if not hasattr(settings, 'loyalty_points_per_sum') or settings.loyalty_points_per_sum is None:
                    settings.loyalty_points_per_sum = 0.01
                if not hasattr(settings, 'loyalty_point_value') or settings.loyalty_point_value is None:
                    settings.loyalty_point_value = 1.0
                if not hasattr(settings, 'enable_location_selection') or settings.enable_location_selection is None:
                    settings.enable_location_selection = True
                if not hasattr(settings, 'enable_offline_orders') or settings.enable_offline_orders is None:
                    settings.enable_offline_orders = True
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
        if settings_update.enable_referals is not None:
            settings.enable_referals = settings_update.enable_referals
        if settings_update.enable_loyalty is not None:
            settings.enable_loyalty = settings_update.enable_loyalty
        if settings_update.enable_price_alerts is not None:
            settings.enable_price_alerts = settings_update.enable_price_alerts
        if settings_update.enable_favorites is not None:
            settings.enable_favorites = settings_update.enable_favorites
        if settings_update.enable_tags is not None:
            settings.enable_tags = settings_update.enable_tags
        if settings_update.enable_reviews is not None:
            settings.enable_reviews = settings_update.enable_reviews
        if settings_update.referal_bonus_points is not None:
            settings.referal_bonus_points = settings_update.referal_bonus_points
        if settings_update.referal_bonus_percent is not None:
            settings.referal_bonus_percent = settings_update.referal_bonus_percent
        if settings_update.loyalty_points_per_sum is not None:
            settings.loyalty_points_per_sum = settings_update.loyalty_points_per_sum
        if settings_update.loyalty_point_value is not None:
            settings.loyalty_point_value = settings_update.loyalty_point_value
        if settings_update.enable_location_selection is not None:
            settings.enable_location_selection = settings_update.enable_location_selection
        if settings_update.enable_offline_orders is not None:
            settings.enable_offline_orders = settings_update.enable_offline_orders
        
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

