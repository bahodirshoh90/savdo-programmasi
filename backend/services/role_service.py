"""
Role and Permission Service
"""
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from models import Role, Permission, Seller
from schemas import RoleCreate, RoleUpdate, RoleResponse, PermissionResponse


class RoleService:
    """Service for role and permission management"""
    
    @staticmethod
    def get_all_permissions(db: Session) -> List[Permission]:
        """Get all available permissions"""
        return db.query(Permission).order_by(Permission.category, Permission.code).all()
    
    @staticmethod
    def create_role(db: Session, role: RoleCreate) -> Role:
        """Create a new role with permissions"""
        db_role = Role(
            name=role.name,
            description=role.description,
            is_system=False
        )
        db.add(db_role)
        db.flush()
        
        # Add permissions
        if role.permission_ids:
            permissions = db.query(Permission).filter(
                Permission.id.in_(role.permission_ids)
            ).all()
            db_role.permissions = permissions
        
        db.commit()
        db.refresh(db_role)
        # Reload with permissions
        return db.query(Role).options(joinedload(Role.permissions)).filter(Role.id == db_role.id).first()
    
    @staticmethod
    def get_roles(db: Session, skip: int = 0, limit: int = 100) -> List[Role]:
        """Get all roles"""
        return db.query(Role).options(joinedload(Role.permissions)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_role(db: Session, role_id: int) -> Optional[Role]:
        """Get a specific role by ID"""
        return db.query(Role).options(joinedload(Role.permissions)).filter(Role.id == role_id).first()
    
    @staticmethod
    def update_role(db: Session, role_id: int, role: RoleUpdate) -> Optional[Role]:
        """Update a role"""
        db_role = db.query(Role).filter(Role.id == role_id).first()
        if not db_role:
            return None
        
        if db_role.is_system:
            # System roles can only update description
            if role.description is not None:
                db_role.description = role.description
        else:
            # Non-system roles can update everything
            if role.name is not None:
                db_role.name = role.name
            if role.description is not None:
                db_role.description = role.description
            
            # Update permissions
            if role.permission_ids is not None:
                permissions = db.query(Permission).filter(
                    Permission.id.in_(role.permission_ids)
                ).all()
                db_role.permissions = permissions
        
        db.commit()
        db.refresh(db_role)
        # Reload with permissions
        return db.query(Role).options(joinedload(Role.permissions)).filter(Role.id == db_role.id).first()
    
    @staticmethod
    def delete_role(db: Session, role_id: int) -> bool:
        """Delete a role (only if not system role and no sellers assigned)"""
        db_role = db.query(Role).filter(Role.id == role_id).first()
        if not db_role:
            return False
        
        if db_role.is_system:
            return False  # Cannot delete system roles
        
        # Check if any sellers are using this role
        sellers_count = db.query(Seller).filter(Seller.role_id == role_id).count()
        if sellers_count > 0:
            return False  # Cannot delete role in use
        
        db.delete(db_role)
        db.commit()
        return True
    
    @staticmethod
    def role_to_response(role: Role) -> RoleResponse:
        """Convert Role model to RoleResponse"""
        return RoleResponse(
            id=role.id,
            name=role.name,
            description=role.description,
            is_system=role.is_system,
            permissions=[PermissionResponse(
                id=p.id,
                code=p.code,
                name=p.name,
                category=p.category,
                description=p.description
            ) for p in role.permissions],
            created_at=role.created_at,
            updated_at=role.updated_at
        )

